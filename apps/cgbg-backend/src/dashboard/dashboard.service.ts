import { Injectable } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { startOfMonth, endOfMonth, subDays, format, startOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(tenantId: string) {
    if (!tenantId) {
      return {
        revenue: 0,
        appointmentsCount: 0,
        newClients: 0,
        occupancy: 0,
      };
    }
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: { gte: monthStart, lte: monthEnd },
      },
      include: { service: true },
    });

    const successfulApps = appointments.filter(
      (a) => a.status === 'COMPLETED' || a.status === 'AUTHORIZED',
    );

    const revenue = successfulApps.reduce(
      (sum, app) => sum + Number(app.service.price),
      0,
    );

    const newClientsItems = await this.prisma.user.count({
        where: {
            tenantId,
            role: 'CLIENT',
            createdAt: { gte: monthStart, lte: monthEnd }
        }
    });

    // Occupancy (Simplistic version: apps / (8 hours * days in month))
    // A better one would check the actual BusinessSchedule
    const dayInMonth = now.getDate();
    const occupancy = (successfulApps.length / (dayInMonth * 8)) * 100;

    return {
      revenue,
      appointmentsCount: appointments.length,
      newClients: newClientsItems,
      occupancy: Math.min(Math.round(occupancy), 100),
    };
  }

  async getRevenueChart(tenantId: string) {
    if (!tenantId) return [];
    const today = startOfDay(new Date());
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

    const chartData = await Promise.all(
      last7Days.map(async (day) => {
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const apps = await this.prisma.appointment.findMany({
          where: {
            tenantId,
            startTime: { gte: day, lte: dayEnd },
            status: { in: ['COMPLETED', 'AUTHORIZED'] },
          },
          include: { service: true },
        });

        const total = apps.reduce((sum, a) => sum + Number(a.service.price), 0);
        return {
          date: format(day, 'dd/MM'),
          amount: total,
        };
      }),
    );

    return chartData;
  }

  async getServiceStats(tenantId: string) {
    if (!tenantId) return [];
    const stats = await this.prisma.appointment.groupBy({
      by: ['serviceId', 'status'],
      where: { tenantId, status: { in: ['COMPLETED', 'AUTHORIZED'] } },
      _count: { id: true },
    });

    // Resolve service names
    const services = await this.prisma.service.findMany({
      where: { tenantId },
      select: { id: true, name: true, color: true },
    });

    return services.map((s) => {
      const count = stats
        .filter((st) => st.serviceId === s.id)
        .reduce((sum, st) => sum + st._count.id, 0);
      return {
        name: s.name,
        count,
        color: s.color || '#4A8E8A',
      };
    }).filter(s => s.count > 0).sort((a,b) => b.count - a.count);
  }
}
