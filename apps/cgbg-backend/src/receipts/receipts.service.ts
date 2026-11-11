import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import Redis from 'ioredis';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

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
    if (!file) throw new BadRequestException('El archivo es obligatorio.');

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos JPG, PNG o PDF.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('El archivo no debe superar 5MB.');
    }

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

    const uploadDir = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads', 'receipts');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const extension = extname(file.originalname) || this.extensionFromMime(file.mimetype);
    const fileName = `${appointment.id}-${Date.now()}${extension}`;
    const filePath = join(uploadDir, fileName);
    writeFileSync(filePath, file.buffer);

    const receiptUrl = `/uploads/receipts/${fileName}`;

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
      receiptUrl,
    };
  }

  private key(token: string) {
    return `cgbg:payment:link:${token}`;
  }

  private extensionFromMime(mimetype: string) {
    if (mimetype === 'image/jpeg') return '.jpg';
    if (mimetype === 'image/png') return '.png';
    return '.pdf';
  }
}
