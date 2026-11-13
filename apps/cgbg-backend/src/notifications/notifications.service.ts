import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType, NotificationActionType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  tenantId?: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  actionType: NotificationActionType;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway
  ) {}

  async create(dto: CreateNotificationDto) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          ...dto,
          isRead: false,
        },
      });

      // Emit real-time notification
      this.gateway.sendToUser(dto.userId, 'new_notification', notification);
      
      this.logger.log(`Notification created and emitted for user: ${dto.userId}`);
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async findAllByUser(userId: string, tenantId: string) {
    return this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async requireOwnedNotification(id: string, userId: string, tenantId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');
  }

  async markAsRead(id: string, userId: string, tenantId: string) {
    await this.requireOwnedNotification(id, userId, tenantId);
    return this.prisma.notification.update({
      where: { id, userId, tenantId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string, userId: string, tenantId: string) {
    await this.requireOwnedNotification(id, userId, tenantId);
    return this.prisma.notification.delete({
      where: { id, userId, tenantId },
    });
  }

  async deleteByRange(userId: string, tenantId: string, days: number) {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - days);

    return this.prisma.notification.deleteMany({
      where: {
        userId,
        tenantId,
        createdAt: {
          lt: cutOffDate,
        },
      },
    });
  }

  async deleteAll(userId: string, tenantId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId, tenantId },
    });
  }
}
