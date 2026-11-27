import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { validateLocalDate, wallTime } from './time-zone';
import type { AvailabilitySlot } from '@cgbg/shared-types';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(branchId: string, serviceId: string, date: string, excludeAppointmentId?: string) {
    validateLocalDate(date);
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado.');
    if (!Number.isInteger(service.durationMin) || service.durationMin <= 0) {
      throw new BadRequestException('La duración del servicio debe ser positiva.');
    }
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.tenantId !== service.tenantId) throw new NotFoundException('Sucursal no encontrada.');
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    const schedule = await this.prisma.businessSchedule.findUnique({ where: { dayOfWeek_branchId: { branchId, dayOfWeek } } });
    if (!schedule?.isOpen) return [];
    const dayStart = await wallTime(this.prisma, date, '00:00', branch.timezone);
    const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    const dayEnd = await wallTime(this.prisma, next.toISOString().slice(0,10), '00:00', branch.timezone);
    const appointments = await this.prisma.appointment.findMany({ where: {
      tenantId: service.tenantId, branchId, id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startTime: { lt: dayEnd }, endTime: { gt: dayStart },
      status: { in: ['PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED'] },
    }, select: { startTime: true, endTime: true } });
    // exceptionDate es un marcador de fecha calendario, no un instante de cita.
    const marker = new Date(`${date}T00:00:00Z`);
    const exceptions = await this.prisma.workException.findMany({ where: { tenantId: service.tenantId,
      exceptionDate: { gte: marker, lt: new Date(marker.getTime() + 86400000) },
    } });
    if (exceptions.some(e => e.isFullDay)) return [];
    const blocked = [...appointments];
    for (const e of exceptions) {
      if (e.startTime && e.endTime) blocked.push({
        startTime: await wallTime(this.prisma,date,e.startTime,branch.timezone),
        endTime: await wallTime(this.prisma,date,e.endTime,branch.timezone),
      });
    }
    const slots: AvailabilitySlot[] = [];
    const duration = service.durationMin * 60000;
    const ranges = [[schedule.openTime,schedule.closeTime]];
    if (schedule.openTime2 && schedule.closeTime2) ranges.push([schedule.openTime2,schedule.closeTime2]);
    for (const [open,close] of ranges) {
      let start = await wallTime(this.prisma,date,open,branch.timezone);
      const end = await wallTime(this.prisma,date,close,branch.timezone);
      // Aioria eligió inicios espaciados por la duración desde la apertura de cada turno.
      while (start.getTime() + duration <= end.getTime()) {
        const finish = new Date(start.getTime() + duration);
        if (start.getTime() > Date.now() && !blocked.some(b => start < b.endTime && finish > b.startTime)) {
          slots.push({ startTime: start.toISOString(), endTime: finish.toISOString() });
        }
        start = finish;
      }
    }
    return [...new Map(slots.map(s => [s.startTime, s])).values()].sort((a,b) => a.startTime.localeCompare(b.startTime));
  }
}
