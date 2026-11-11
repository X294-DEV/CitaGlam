import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { EmailProvider } from '@cgbg/email';
import { addHours, format } from 'date-fns';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AvailabilityService } from './availability.service';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private messaging: MessagingService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  async create(dto: CreateAppointmentDto, authenticatedClientId?: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: { tenant: true },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado.');

    let finalClientId = authenticatedClientId;

    if (!finalClientId) {
      if (!dto.clientInfo) {
        throw new ForbiddenException('Se requiere información del cliente para la reserva.');
      }

      if (!dto.clientInfo.termsAccepted) {
        throw new ForbiddenException('Debe aceptar los términos y condiciones para continuar.');
      }

      const user = await this.prisma.user.upsert({
        where: { email: dto.clientInfo.email },
        update: {
          firstName: dto.clientInfo.firstName,
          lastName: dto.clientInfo.lastName,
          profile: {
            upsert: {
              create: { phone: dto.clientInfo.phone },
              update: { phone: dto.clientInfo.phone },
            },
          },
        },
        create: {
          email: dto.clientInfo.email,
          firstName: dto.clientInfo.firstName,
          lastName: dto.clientInfo.lastName,
          role: 'CLIENT',
          isActive: true,
          profile: {
            create: { phone: dto.clientInfo.phone },
          },
        },
      });
      finalClientId = user.id;
    }

    const startTime = new Date(dto.startTime);
    startTime.setUTCMinutes(0, 0, 0);

    const availableSlots = await this.availability.getAvailableSlots(
      dto.branchId,
      dto.serviceId,
      startTime.toISOString(),
    );
    const requestHour = format(startTime, 'HH:00');

    if (!availableSlots.includes(requestHour)) {
      throw new ConflictException('El horario seleccionado ya no está disponible.');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: service.tenantId,
        branchId: dto.branchId,
        serviceId: dto.serviceId,
        clientId: finalClientId,
        startTime,
        endTime: addHours(startTime, 1),
        paymentExpiry: addHours(new Date(), 24),
        status: 'PENDING_PAYMENT',
        notes: dto.notes,
        payment: {
          create: {
            amount: service.price,
            method: 'TRANSFER',
          },
        },
      },
      include: {
        tenant: true,
        client: true,
        service: true,
        branch: true,
        payment: true,
      },
    });

    await this.messaging.emitAppointmentCreated({
      appointmentId: appointment.id,
      tenantId: appointment.tenantId,
      customerId: appointment.clientId,
      dateTime: appointment.startTime.toISOString(),
      amount: appointment.payment?.amount?.toString() || service.price.toString(),
    });

    try {
      await this.emailProvider.sendEmail({
        to: appointment.client.email,
        subject: `Reserva recibida: ${service.name} - ${appointment.tenant.name}`,
        template: 'appointment-pending',
        context: {
          user_name: appointment.client.firstName,
          business_name: appointment.tenant.name,
          service_name: service.name,
          appointment_date: format(startTime, 'dd/MM/yyyy'),
          appointment_time: requestHour,
        },
      });
    } catch (error) {
      console.warn('Appointment email skipped:', (error as Error).message);
    }

    return appointment;
  }

  async approve(id: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, tenant: true, service: true, payment: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException('Solo se pueden autorizar citas con comprobante pendiente de aprobaciÃ³n.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'AUTHORIZED',
        payment: appointment.payment
          ? {
              update: {
                isApproved: true,
                approvedAt: new Date(),
              },
            }
          : undefined,
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: appointment.client.email,
        subject: `¡Cita Confirmada! - ${appointment.tenant.name}`,
        template: 'appointment-confirmation',
        context: {
          user_name: appointment.client.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: format(appointment.startTime, 'dd/MM/yyyy'),
          appointment_time: format(appointment.startTime, 'HH:00'),
        },
      });
    } catch (error) {
      console.warn('Appointment approval email skipped:', (error as Error).message);
    }

    return updated;
  }

  async reject(id: string, tenantId: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, tenant: true, service: true, payment: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException('Solo se pueden rechazar citas con comprobante pendiente de aprobaciÃ³n.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: [appointment.notes, reason ? `Pago rechazado: ${reason}` : 'Pago rechazado por el negocio']
          .filter(Boolean)
          .join('\n'),
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: appointment.client.email,
        subject: `Comprobante rechazado - ${appointment.tenant.name}`,
        template: 'appointment-rejected',
        context: {
          user_name: appointment.client.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: format(appointment.startTime, 'dd/MM/yyyy'),
          appointment_time: format(appointment.startTime, 'HH:00'),
          reason: reason || 'El comprobante no pudo ser validado por el negocio.',
        },
      });
    } catch (error) {
      console.warn('Appointment rejection email skipped:', (error as Error).message);
    }

    return updated;
  }

  async cancel(id: string, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, tenant: true, service: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('La cita ya está cancelada.');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('No se puede cancelar una cita completada.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: [appointment.notes, 'Cita cancelada por el negocio'].filter(Boolean).join('\n'),
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: appointment.client.email,
        subject: `Cita cancelada - ${appointment.tenant.name}`,
        template: 'appointment-cancelled',
        context: {
          user_name: appointment.client.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: format(appointment.startTime, 'dd/MM/yyyy'),
          appointment_time: format(appointment.startTime, 'HH:00'),
        },
      });
    } catch (error) {
      console.warn('Appointment cancellation email skipped:', (error as Error).message);
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, tenant: true, service: true, payment: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (dto.status === 'AUTHORIZED') {
      return this.approve(id, tenantId);
    }

    if (dto.status === 'CANCELLED') {
      return this.cancel(id, tenantId);
    }

    if (dto.status !== 'COMPLETED') {
      throw new BadRequestException('Este cambio de estatus no estÃ¡ permitido desde el panel.');
    }

    if (appointment.status !== 'AUTHORIZED') {
      throw new BadRequestException('Solo se pueden completar citas autorizadas.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        notes: [appointment.notes, dto.reason ? `Cierre: ${dto.reason}` : undefined]
          .filter(Boolean)
          .join('\n'),
      },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        service: true,
        branch: true,
        payment: true,
      },
    });
  }

  async findPendingApprovalByTenant(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId, status: 'WAITING_APPROVAL' },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, tenantId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, tenant: true, service: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    const newDate = new Date(dto.newStartTime);
    newDate.setUTCMinutes(0, 0, 0);

    const availableSlots = await this.availability.getAvailableSlots(
      appointment.branchId,
      appointment.serviceId,
      newDate.toISOString(),
    );
    const requestHour = format(newDate, 'HH:00');

    if (!availableSlots.includes(requestHour)) {
      throw new ConflictException('El nuevo horario seleccionado no está disponible.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        startTime: newDate,
        endTime: addHours(newDate, 1),
        status: appointment.status,
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: appointment.client.email,
        subject: `Cambio de horario: ${appointment.tenant.name}`,
        template: 'appointment-rescheduled',
        context: {
          user_name: appointment.client.firstName,
          service_name: appointment.service.name,
          business_name: appointment.tenant.name,
          appointment_date: format(newDate, 'dd/MM/yyyy'),
          appointment_time: requestHour,
          old_date: format(appointment.startTime, 'dd/MM/yyyy HH:00'),
          reason: dto.reason || 'Ajuste operativo del negocio',
        },
      });
    } catch (error) {
      console.warn('Appointment reschedule email skipped:', (error as Error).message);
    }

    return updated;
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findAllByClient(clientId: string) {
    return this.prisma.appointment.findMany({
      where: { clientId },
      include: {
        tenant: true,
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }
}
