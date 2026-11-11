import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

export interface AppointmentCreatedPayload {
  appointmentId: string;
  tenantId: string;
  customerId: string;
  dateTime: string;
  amount: string | number;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;
  private connecting?: Promise<amqp.Channel>;

  private readonly url = process.env.RMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly exchange = 'cgbg.appointments';

  async emitAppointmentCreated(payload: AppointmentCreatedPayload): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.publish(
        this.exchange,
        'appointment.created',
        Buffer.from(JSON.stringify(payload)),
        { contentType: 'application/json', persistent: true },
      );
      this.logger.log(`appointment.created emitted for ${payload.appointmentId}`);
    } catch (error) {
      this.logger.warn(`RabbitMQ unavailable; appointment event skipped: ${(error as Error).message}`);
    }
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) return this.channel;
    if (!this.connecting) {
      this.connecting = this.createChannel();
    }
    return this.connecting;
  }

  private async createChannel(): Promise<amqp.Channel> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    return this.channel;
  }
}
