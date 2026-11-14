import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import Redis from 'ioredis';
import { resolveStoredFile, saveUploadedFile, streamStoredFile } from './stored-files';

@Injectable()
export class ReceiptsService {
  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(private prisma: PrismaService) {}

  async validateToken(token: string) {
    const appointmentId = await this.redis.get(this.key(token));
    if (!appointmentId) {
      throw new NotFoundException('El enlace de comprobante no existe o expiró.');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        tenant: true,
        service: true,
        branch: true,
        payment: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }

    return {
      id: appointment.id,
      tenantName: appointment.tenant.name,
      serviceName: appointment.service.name,
      branchName: appointment.branch.name,
      amount: appointment.payment?.amount || appointment.service.price,
      startTime: appointment.startTime,
      status: appointment.status,
    };
  }

  async upload(token: string, file: Express.Multer.File) {
    const appointmentId = await this.redis.get(this.key(token));
    if (!appointmentId) {
      throw new NotFoundException('El enlace de comprobante no existe o expiró.');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { payment: true },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
    if (appointment.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Esta cita ya no está esperando comprobante.');
    }

    // Valida el contenido real (JPG, PNG o PDF) y genera el nombre en el servidor.
    // Se guarda la ruta interna; el archivo solo se entrega por GET /receipts/:appointmentId/file.
    const receiptUrl = saveUploadedFile('receipts', appointment.id, file);

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'WAITING_APPROVAL',
        payment: appointment.payment
          ? { update: { receiptUrl } }
          : {
              create: {
                amount: 0,
                method: 'TRANSFER',
                receiptUrl,
              },
            },
      },
    });

    await this.redis.del(this.key(token));

    return {
      message: 'Comprobante recibido. Tu cita queda pendiente de aprobación.',
      appointmentId: appointment.id,
    };
  }

  /**
   * Comprobante de una cita para el panel. El tenant sale del JWT: si la cita es
   * de otro negocio responde 404, igual que si no existiera.
   */
  async getReceiptFile(appointmentId: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
      select: { id: true, payment: { select: { receiptUrl: true } } },
    });
    if (!appointment) throw new NotFoundException('Comprobante no encontrado.');

    const filePath = resolveStoredFile('receipts', appointment.payment?.receiptUrl);
    return streamStoredFile(filePath, `comprobante-${appointment.id}`);
  }

  private key(token: string) {
    return `cgbg:payment:link:${token}`;
  }
}
