import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export const PAYMENT_LINK_TTL_MS = 60 * 60 * 1000;
const INVALID_LINK = 'El enlace de comprobante no está disponible o expiró.';

/** Servicio interno compartido por API y worker; nunca registrar su resultado de create. */
@Injectable()
export class PaymentLinkService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new NotFoundException(INVALID_LINK);
    }
    return createHash('sha256').update(token).digest('hex');
  }

  async create(appointmentId: string, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serializa emisión y cambios de vencimiento para esta cita.
      const rows = await tx.$queryRaw<{ paymentExpiry: Date | null }[]>`
        SELECT "paymentExpiry" FROM "Appointment"
        WHERE id = ${appointmentId} AND "tenantId" = ${tenantId}
          AND status = 'PENDING_PAYMENT' FOR UPDATE`;
      if (!rows.length) throw new NotFoundException(INVALID_LINK);
      const now = Date.now();
      // Nunca prolongar la ventana de pago original al procesar/reintentar un trabajo.
      const expiresAt = new Date(Math.min(rows[0].paymentExpiry?.getTime() ?? now + PAYMENT_LINK_TTL_MS, now + PAYMENT_LINK_TTL_MS));
      if (expiresAt.getTime() <= now) throw new NotFoundException(INVALID_LINK);
      const token = randomBytes(32).toString('base64url');
      await tx.appointment.update({ where: { id: appointmentId, tenantId }, data: { paymentExpiry: expiresAt } });
      await tx.paymentLink.create({ data: { appointmentId, tokenHash: this.hash(token), expiresAt }, select: { id: true } });
      return { token, appointmentId, expiresAt };
    });
  }

  /** Lectura para mostrar el formulario; validar no consume el enlace. */
  async validate(token: string, tx: Prisma.TransactionClient = this.prisma) {
    const now = new Date();
    const row = await tx.paymentLink.findFirst({
      where: { tokenHash: this.hash(token), usedAt: null, expiresAt: { gt: now },
        appointment: { status: 'PENDING_PAYMENT', paymentExpiry: { gt: now } } },
      select: { appointmentId: true, expiresAt: true },
    });
    if (!row) throw new NotFoundException(INVALID_LINK);
    return row;
  }

  /** Pasar la transacción de recibo para revertir el consumo si guardar el comprobante falla. */
  async consume(token: string, tx?: Prisma.TransactionClient): Promise<{ appointmentId: string }> {
    if (!tx) return this.prisma.$transaction((transaction) => this.consume(token, transaction));
    const tokenHash = this.hash(token);
    const now = new Date();
    const claimed = await tx.paymentLink.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now },
        appointment: { status: 'PENDING_PAYMENT', paymentExpiry: { gt: now } } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new NotFoundException(INVALID_LINK);
    return tx.paymentLink.findUniqueOrThrow({ where: { tokenHash }, select: { appointmentId: true } });
  }
}
