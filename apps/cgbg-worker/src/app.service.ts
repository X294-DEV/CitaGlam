import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import * as amqp from 'amqplib';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

interface AppointmentCreatedPayload {
  appointmentId: string;
  tenantId: string;
  customerId: string;
  dateTime: string;
  amount: string | number;
}

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private readonly rmqUrl = process.env.RMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly webUrl = process.env.WEB_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.startConsumer();
    await this.cleanupExpiredAppointments();
    setInterval(() => {
      this.cleanupExpiredAppointments().catch((error) => {
        this.logger.error(`Cleanup failed: ${(error as Error).message}`);
      });
    }, 60 * 60 * 1000);
  }

  getHello(): string {
    return 'CGBG worker running';
  }

  private async startConsumer() {
    try {
      const connection = await amqp.connect(this.rmqUrl);
      const channel = await connection.createChannel();
      const exchange = 'cgbg.appointments';
      const queue = 'cgbg.notifications.queue';

      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, 'appointment.created');

      await channel.consume(queue, async (message) => {
        if (!message) return;
        try {
          const payload = JSON.parse(message.content.toString()) as AppointmentCreatedPayload;
          await this.createPaymentLink(payload);
          channel.ack(message);
        } catch (error) {
          this.logger.error(`Message processing failed: ${(error as Error).message}`);
          channel.nack(message, false, false);
        }
      });

      this.logger.log('Listening for appointment.created events');
    } catch (error) {
      this.logger.warn(`RabbitMQ consumer unavailable: ${(error as Error).message}`);
    }
  }

  private async createPaymentLink(payload: AppointmentCreatedPayload) {
    const token = randomUUID();
    const key = `cgbg:payment:link:${token}`;
    const ttlSeconds = 24 * 60 * 60;
    await this.redis.set(key, payload.appointmentId, 'EX', ttlSeconds);

    const expiryDate = new Date(Date.now() + ttlSeconds * 1000);
    const url = `${this.webUrl.replace(/\/$/, '')}/upload-receipt/${token}`;

    this.logger.log(`[DEBUG] Notificación de Cita: Enviando link de pago para la cita ${payload.appointmentId} al cliente ${payload.customerId}...`);
    this.logger.log(`[DEBUG] Link de Pago Generado Exitosamente: ${url}`);
    this.logger.log(`[DEBUG] Vigencia: 24 horas (Expira en UTC: ${expiryDate.toISOString()})`);
  }

  private async cleanupExpiredAppointments() {
    const result = await this.prisma.appointment.updateMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentExpiry: { lt: new Date() },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count > 0) {
      this.logger.log(`[DEBUG] ${result.count} cita(s) cancelada(s) automáticamente por falta de pago.`);
    }
  }
}
