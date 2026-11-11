import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const clients = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'CLIENT',
      },
      include: {
        profile: true,
        appointments: {
          select: {
            id: true,
            status: true,
            startTime: true,
            service: {
              select: {
                price: true,
              },
            },
          },
        },
      },
    });

    return clients.map((client) => {
      const completedApps = client.appointments.filter(
        (a) => a.status === 'COMPLETED' || a.status === 'AUTHORIZED',
      );
      
      const totalSpent = completedApps.reduce(
        (sum, app) => sum + Number(app.service.price),
        0
      );

      const lastVisit = client.appointments.length > 0 
        ? client.appointments.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0].startTime 
        : null;

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.profile?.phone || '', // Need to include profile if used, but User has phone in appointments service upsert
        totalSpent,
        appointmentsCount: client.appointments.length,
        lastVisit,
      };
    });
  }

  async findOne(id: string, tenantId: string) {
    const client = await this.prisma.user.findFirst({
      where: { id, tenantId, role: 'CLIENT' },
      include: {
        profile: true,
        appointments: {
          include: {
            service: true,
            branch: true,
          },
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!client) throw new NotFoundException('Cliente no encontrado.');

    const completedApps = client.appointments.filter(
      (a) => a.status === 'COMPLETED' || a.status === 'AUTHORIZED',
    );
    
    const totalSpent = completedApps.reduce(
      (sum, app) => sum + Number(app.service.price),
      0
    );

    return {
      ...client,
      totalSpent,
      appointmentsCount: client.appointments.length,
    };
  }

  async createManual(tenantId: string, data: any) {
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'CLIENT',
        isActive: true,
        // Profile or extra fields could go here
      },
    });
  }
}
