import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { startOfDay, endOfDay, addHours, format, parse, isValid } from 'date-fns';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(branchId: string, serviceId: string, dateStr: string) {
    const date = new Date(dateStr);
    if (!isValid(date)) throw new NotFoundException('Fecha inválida.');

    const dayOfWeek = date.getUTCDay(); // 0-6

    // 1. Get Branch Schedule for the day
    const schedule = await this.prisma.businessSchedule.findUnique({
      where: {
        dayOfWeek_branchId: { branchId, dayOfWeek },
      },
    });

    if (!schedule || !schedule.isOpen) {
      return []; // Closed
    }

    // 2. Get Service Duration (though we assume hourly intervals HH:00 per user request)
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Servicio no encontrado.');

    // 3. Get Exceptions for the day
    const exceptions = await this.prisma.workException.findMany({
      where: {
        tenantId: service.tenantId,
        exceptionDate: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
    });

    // 4. Get Existing Appointments (Confirmed or Pending)
    const appointments = await this.prisma.appointment.findMany({
      where: {
        branchId,
        startTime: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
        status: { in: ['PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED'] },
      },
    });

    // 5. Generate Hourly Slots for both ranges
    const slots: string[] = [];
    
    const checkRange = (startStr: string, endStr: string) => {
      const startParts = startStr.split(':');
      const endParts = endStr.split(':');
      
      let current = startOfDay(date);
      current.setUTCHours(parseInt(startParts[0]), 0, 0, 0);

      const end = startOfDay(date);
      end.setUTCHours(parseInt(endParts[0]), 0, 0, 0);

      while (current < end) {
        const slotStr = format(current, 'HH:00');
        
        // Check exceptions
        const isBlockedByException = exceptions.some(ex => {
          if (ex.isFullDay) return true;
          if (!ex.startTime || !ex.endTime) return false;
          const exStart = parseInt(ex.startTime.split(':')[0]);
          const exEnd = parseInt(ex.endTime.split(':')[0]);
          const currentHour = current.getUTCHours();
          return currentHour >= exStart && currentHour < exEnd;
        });

        // Check appointments
        const isOccupied = appointments.some(app => app.startTime.getUTCHours() === current.getUTCHours());

        if (!isBlockedByException && !isOccupied) {
          slots.push(slotStr);
        }
        current = addHours(current, 1);
      }
    };

    // First Range
    checkRange(schedule.openTime, schedule.closeTime);
    
    // Second Range (Optional Split Shift)
    if (schedule.openTime2 && schedule.closeTime2) {
      checkRange(schedule.openTime2, schedule.closeTime2);
    }

    return slots;
  }
}
