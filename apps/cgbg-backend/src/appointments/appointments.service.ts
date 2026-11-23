import { saveWithSlotConflict } from './slot-conflict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizePhone } from '../clients/dto/create-customer.dto';
import { PrismaService } from '@cgbg/prisma';
import { EmailProvider } from '@cgbg/email';
import { addHours } from 'date-fns';
import { parseInstant, localDate, localTime, displayDate } from './time-zone';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AvailabilityService } from './availability.service';
import { MessagingService } from '../messaging/messaging.service';

const publicClientSelect = { id: true, firstName: true, lastName: true } as const;
const panelClientSelect = { ...publicClientSelect, email: true } as const;
const tenantSelect = { id: true, name: true, slug: true, logoUrl: true } as const;

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
    });
    if (!service) throw new NotFoundException('Servicio no encontrado.');

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
      select: { tenantId: true, timezone: true },
    });
    if (!branch || branch.tenantId !== service.tenantId) {
      throw new NotFoundException('Sucursal no encontrada.');
    }

    const linkedCustomer = authenticatedClientId ? await this.prisma.customer.findFirst({
      where: { userId: authenticatedClientId, tenantId: service.tenantId }, select: { id: true },
    }) : null;
    if (authenticatedClientId && !linkedCustomer) throw new NotFoundException('Cliente no encontrado en este negocio.');
    let finalClientId = linkedCustomer?.id;

    if (!finalClientId) {
      if (!dto.clientInfo) {
        throw new ForbiddenException('Se requiere información del cliente para la reserva.');
      }

      if (!dto.clientInfo.termsAccepted) {
        throw new ForbiddenException('Debe aceptar los términos y condiciones para continuar.');
      }

      const phone = normalizePhone(dto.clientInfo.phone) as string;
      const customer = await this.prisma.customer.upsert({
        where: { tenantId_phone: { tenantId: service.tenantId, phone } }, update: {},
        create: { tenantId: service.tenantId, phone, email: dto.clientInfo.email,
          firstName: dto.clientInfo.firstName, lastName: dto.clientInfo.lastName },
        select: { id: true },
      });
      finalClientId = customer.id;
    }

    const startTime = parseInstant(dto.startTime);

    const availableSlots = await this.availability.getAvailableSlots(
      dto.branchId,
      dto.serviceId,
      localDate(startTime, branch.timezone),
    );
    const requestHour = localTime(startTime, branch.timezone);

    const selectedSlot = availableSlots.find(slot => slot.startTime === startTime.toISOString());
    if (!selectedSlot) {
      throw new ConflictException('El horario seleccionado ya no está disponible.');
    }

    const appointment = await saveWithSlotConflict(() => this.prisma.appointment.create({
      data: {
        tenantId: service.tenantId,
        branchId: dto.branchId,
        serviceId: dto.serviceId,
        customerId: finalClientId,
        startTime,
        endTime: new Date(selectedSlot.endTime),
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
        tenant: { select: tenantSelect },
        customer: { select: publicClientSelect },
        service: true,
        branch: true,
        payment: true,
      },
    }));

    await this.messaging.emitAppointmentCreated({
      appointmentId: appointment.id,
      tenantId: appointment.tenantId,
      customerId: appointment.customerId,
      dateTime: appointment.startTime.toISOString(),
      amount: appointment.payment?.amount?.toString() || service.price.toString(),
    });

    const client = await this.prisma.customer.findUniqueOrThrow({
      where: { id: finalClientId },
      select: { email: true },
    });

    try {
      await this.emailProvider.sendEmail({
        to: client.email,
        subject: `Reserva recibida: ${service.name} - ${appointment.tenant.name}`,
        template: 'appointment-pending',
        context: {
          user_name: appointment.customer.firstName,
          business_name: appointment.tenant.name,
          service_name: service.name,
          appointment_date: displayDate(startTime, appointment.branch.timezone),
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
      include: { customer: { select: panelClientSelect }, tenant: { select: tenantSelect }, branch: true, service: true, payment: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException('Solo se pueden autorizar citas con comprobante pendiente de aprobación.');
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
        to: appointment.customer.email,
        subject: `¡Cita Confirmada! - ${appointment.tenant.name}`,
        template: 'appointment-confirmation',
        context: {
          user_name: appointment.customer.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: displayDate(appointment.startTime, appointment.branch.timezone),
          appointment_time: localTime(appointment.startTime, appointment.branch.timezone),
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
      include: { customer: { select: panelClientSelect }, tenant: { select: tenantSelect }, branch: true, service: true, payment: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (appointment.status !== 'WAITING_APPROVAL') {
      throw new BadRequestException('Solo se pueden rechazar citas con comprobante pendiente de aprobación.');
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
        to: appointment.customer.email,
        subject: `Comprobante rechazado - ${appointment.tenant.name}`,
        template: 'appointment-rejected',
        context: {
          user_name: appointment.customer.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: displayDate(appointment.startTime, appointment.branch.timezone),
          appointment_time: localTime(appointment.startTime, appointment.branch.timezone),
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
      include: { customer: { select: panelClientSelect }, tenant: { select: tenantSelect }, branch: true, service: true },
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
        to: appointment.customer.email,
        subject: `Cita cancelada - ${appointment.tenant.name}`,
        template: 'appointment-cancelled',
        context: {
          user_name: appointment.customer.firstName,
          business_name: appointment.tenant.name,
          service_name: appointment.service.name,
          appointment_date: displayDate(appointment.startTime, appointment.branch.timezone),
          appointment_time: localTime(appointment.startTime, appointment.branch.timezone),
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
      include: { customer: { select: panelClientSelect }, tenant: { select: tenantSelect }, branch: true, service: true, payment: true },
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
      throw new BadRequestException('Este cambio de estatus no está permitido desde el panel.');
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
        customer: { select: panelClientSelect },
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
        customer: { select: panelClientSelect },
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto, tenantId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { customer: { select: panelClientSelect }, tenant: { select: tenantSelect }, branch: true, service: true },
    });

    if (!appointment || appointment.tenantId !== tenantId) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (!['PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED'].includes(appointment.status)) {
      throw new BadRequestException('Solo se pueden reprogramar citas pendientes o autorizadas.');
    }

    const newDate = parseInstant(dto.newStartTime);

    const availableSlots = await this.availability.getAvailableSlots(
      appointment.branchId,
      appointment.serviceId,
      localDate(newDate, appointment.branch.timezone),
      appointment.id,
    );
    const requestHour = localTime(newDate, appointment.branch.timezone);

    const selectedSlot = availableSlots.find(slot => slot.startTime === newDate.toISOString());
    if (!selectedSlot) {
      throw new ConflictException('El nuevo horario seleccionado no está disponible.');
    }

    const updated = await saveWithSlotConflict(() => this.prisma.appointment.update({
      where: { id, tenantId },
      data: {
        startTime: newDate,
        endTime: new Date(selectedSlot.endTime),
        status: appointment.status,
      },
    }));

    try {
      await this.emailProvider.sendEmail({
        to: appointment.customer.email,
        subject: `Cambio de horario: ${appointment.tenant.name}`,
        template: 'appointment-rescheduled',
        context: {
          user_name: appointment.customer.firstName,
          service_name: appointment.service.name,
          business_name: appointment.tenant.name,
          appointment_date: displayDate(newDate, appointment.branch.timezone),
          appointment_time: requestHour,
          old_date: `${displayDate(appointment.startTime, appointment.branch.timezone)} ${localTime(appointment.startTime, appointment.branch.timezone)}`,
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
        customer: { select: panelClientSelect },
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findAllByClient(clientId: string) {
    return this.prisma.appointment.findMany({
      where: { customer: { userId: clientId } },
      include: {
        tenant: { select: tenantSelect },
        service: true,
        branch: true,
        payment: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }
}
