import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { Prisma } from '@prisma/client';
import { EmailProvider } from '@cgbg/email';
import { addHours } from 'date-fns';
import {
  CreateAppointmentDto,
  CreatePublicAppointmentDto,
} from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AvailabilityService } from './availability.service';
import { MessagingService } from '../messaging/messaging.service';
import { parseInstant, localDate, localTime, displayDate } from './time-zone';
import { saveWithSlotConflict } from './slot-conflict';
import {
  appointmentInclude,
  AppointmentRecord,
  toAppointmentDto,
  toPublicAppointment,
} from './appointment.select';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private availability: AvailabilityService,
    private messaging: MessagingService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  private async bookingContext(
    dto: { branchId: string; serviceId: string; startTime: string },
    tenantId: string,
  ) {
    const startTime = parseInstant(dto.startTime);
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, tenantId },
    });
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!service || !branch)
      throw new NotFoundException('Servicio o sucursal no encontrados.');
    const slots = await this.availability.getAvailableSlots(
      branch.id,
      service.id,
      localDate(startTime, branch.timezone),
    );
    const slot = slots.find((s) => s.startTime === startTime.toISOString());
    if (!slot)
      throw new ConflictException(
        'El horario seleccionado ya no está disponible.',
      );
    return { service, branch, startTime, endTime: new Date(slot.endTime) };
  }

  private creationData(
    dto: { notes?: string },
    context: Awaited<ReturnType<AppointmentsService['bookingContext']>>,
    customerId: string,
    termsAcceptedAt: Date | null,
  ) {
    return {
      tenantId: context.service.tenantId,
      branchId: context.branch.id,
      serviceId: context.service.id,
      customerId,
      startTime: context.startTime,
      endTime: context.endTime,
      notes: dto.notes,
      termsAcceptedAt,
      paymentExpiry: addHours(new Date(), 24),
      status: 'PENDING_PAYMENT' as const,
      payment: {
        create: { amount: context.service.price, method: 'TRANSFER' as const },
      },
    };
  }

  async create(dto: CreateAppointmentDto, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    const context = await this.bookingContext(dto, tenantId);
    const record = await saveWithSlotConflict(() =>
      this.prisma.appointment.create({
        data: this.creationData(dto, context, customer.id, null),
        include: appointmentInclude,
      }),
    );
    await this.created(record);
    return toAppointmentDto(record);
  }

  async createPublic(dto: CreatePublicAppointmentDto) {
    if (dto.termsAccepted !== true)
      throw new BadRequestException('Debe aceptar los términos para reservar.');
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase() },
      select: { id: true, isActive: true },
    });
    if (!tenant?.isActive)
      throw new NotFoundException('Negocio no encontrado.');
    const context = await this.bookingContext(dto, tenant.id);
    if (!context.service.isActive)
      throw new NotFoundException('Servicio no encontrado.');
    const record = await saveWithSlotConflict(async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.upsert({
              where: {
                tenantId_phone: {
                  tenantId: tenant.id,
                  phone: dto.clientInfo.phone,
                },
              },
              update: {},
              create: {
                tenantId: tenant.id,
                firstName: dto.clientInfo.firstName,
                lastName: dto.clientInfo.lastName,
                email: dto.clientInfo.email,
                phone: dto.clientInfo.phone,
              },
              select: { id: true },
            });
            return tx.appointment.create({
              data: this.creationData(dto, context, customer.id, new Date()),
              include: appointmentInclude,
            });
          });
        } catch (error) {
          if (
            attempt === 0 &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            JSON.stringify(error.meta?.target ?? '').includes('phone')
          )
            continue;
          throw error;
        }
      }
    });
    await this.created(record);
    return toPublicAppointment(record);
  }

  private async created(record: AppointmentRecord) {
    await this.messaging.emitAppointmentCreated({
      appointmentId: record.id,
      tenantId: record.tenantId,
      customerId: record.customerId,
      dateTime: record.startTime.toISOString(),
      amount:
        record.payment?.amount.toString() ?? record.service.price.toString(),
    });
    await this.notify(
      record,
      'appointment-pending',
      `Reserva recibida: ${record.service.name} - ${record.tenant.name}`,
    );
  }

  private async notify(
    record: AppointmentRecord,
    template: string,
    subject: string,
    extra: Record<string, string> = {},
  ) {
    try {
      await this.emailProvider.sendEmail({
        to: record.customer.email,
        subject,
        template,
        context: {
          user_name: record.customer.firstName,
          business_name: record.tenant.name,
          service_name: record.service.name,
          appointment_date: displayDate(
            record.startTime,
            record.branch.timezone,
          ),
          appointment_time: localTime(record.startTime, record.branch.timezone),
          ...extra,
        },
      });
    } catch (error) {
      console.warn('Appointment email skipped:', (error as Error).message);
    }
  }

  private async own(id: string, tenantId: string) {
    const row = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: appointmentInclude,
    });
    if (!row) throw new NotFoundException('Cita no encontrada.');
    return row;
  }
  private notes(notes: string | null, extra?: string) {
    return [notes, extra].filter(Boolean).join('\n') || null;
  }

  async approve(id: string, tenantId: string) {
    const row = await this.own(id, tenantId);
    if (row.status !== 'WAITING_APPROVAL')
      throw new BadRequestException(
        'Solo se pueden autorizar citas con comprobante pendiente de aprobación.',
      );
    const updated = await this.prisma.appointment.update({
      where: { id, tenantId },
      data: {
        status: 'AUTHORIZED',
        payment: row.payment
          ? { update: { isApproved: true, approvedAt: new Date() } }
          : undefined,
      },
      include: appointmentInclude,
    });
    await this.notify(
      updated,
      'appointment-confirmation',
      `¡Cita Confirmada! - ${row.tenant.name}`,
    );
    return toAppointmentDto(updated);
  }
  async reject(id: string, tenantId: string, reason?: string) {
    const row = await this.own(id, tenantId);
    if (row.status !== 'WAITING_APPROVAL')
      throw new BadRequestException(
        'Solo se pueden rechazar citas con comprobante pendiente de aprobación.',
      );
    const updated = await this.prisma.appointment.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        notes: this.notes(
          row.notes,
          reason
            ? `Pago rechazado: ${reason}`
            : 'Pago rechazado por el negocio',
        ),
      },
      include: appointmentInclude,
    });
    await this.notify(
      updated,
      'appointment-rejected',
      `Comprobante rechazado - ${row.tenant.name}`,
      {
        reason: reason || 'El comprobante no pudo ser validado por el negocio.',
      },
    );
    return toAppointmentDto(updated);
  }
  async cancel(id: string, tenantId: string) {
    const row = await this.own(id, tenantId);
    if (row.status === 'CANCELLED' || row.status === 'COMPLETED')
      throw new BadRequestException('No se puede cancelar esta cita.');
    const updated = await this.prisma.appointment.update({
      where: { id, tenantId },
      data: {
        status: 'CANCELLED',
        notes: this.notes(row.notes, 'Cita cancelada por el negocio'),
      },
      include: appointmentInclude,
    });
    await this.notify(
      updated,
      'appointment-cancelled',
      `Cita cancelada - ${row.tenant.name}`,
    );
    return toAppointmentDto(updated);
  }
  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    tenantId: string,
  ) {
    if (dto.status === 'AUTHORIZED') return this.approve(id, tenantId);
    if (dto.status === 'CANCELLED') return this.cancel(id, tenantId);
    const row = await this.own(id, tenantId);
    if (dto.status !== 'COMPLETED' || row.status !== 'AUTHORIZED')
      throw new BadRequestException(
        'Solo se pueden completar citas autorizadas.',
      );
    const updated = await this.prisma.appointment.update({
      where: { id, tenantId },
      data: {
        status: 'COMPLETED',
        notes: this.notes(
          row.notes,
          dto.reason ? `Cierre: ${dto.reason}` : undefined,
        ),
      },
      include: appointmentInclude,
    });
    return toAppointmentDto(updated);
  }
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    tenantId: string,
  ) {
    const row = await this.own(id, tenantId);
    if (
      !['PENDING_PAYMENT', 'WAITING_APPROVAL', 'AUTHORIZED'].includes(
        row.status,
      )
    )
      throw new BadRequestException(
        'Solo se pueden reprogramar citas pendientes o autorizadas.',
      );
    const start = parseInstant(dto.newStartTime);
    const slots = await this.availability.getAvailableSlots(
      row.branchId,
      row.serviceId,
      localDate(start, row.branch.timezone),
      row.id,
      tenantId,
    );
    const slot = slots.find((s) => s.startTime === start.toISOString());
    if (!slot)
      throw new ConflictException(
        'El nuevo horario seleccionado no está disponible.',
      );
    const updated = await saveWithSlotConflict(() =>
      this.prisma.appointment.update({
        where: { id, tenantId },
        data: { startTime: start, endTime: new Date(slot.endTime) },
        include: appointmentInclude,
      }),
    );
    await this.notify(
      updated,
      'appointment-rescheduled',
      `Cambio de horario: ${row.tenant.name}`,
      {
        old_date: `${displayDate(row.startTime, row.branch.timezone)} ${localTime(row.startTime, row.branch.timezone)}`,
        reason: dto.reason || 'Ajuste operativo del negocio',
      },
    );
    return toAppointmentDto(updated);
  }
  async findPendingApprovalByTenant(tenantId: string) {
    return (
      await this.prisma.appointment.findMany({
        where: { tenantId, status: 'WAITING_APPROVAL' },
        include: appointmentInclude,
        orderBy: { startTime: 'asc' },
      })
    ).map(toAppointmentDto);
  }
  async findAllByTenant(tenantId: string) {
    return (
      await this.prisma.appointment.findMany({
        where: { tenantId },
        include: appointmentInclude,
        orderBy: { startTime: 'desc' },
      })
    ).map(toAppointmentDto);
  }
  async findAllByClient(userId: string, tenantId: string) {
    return (
      await this.prisma.appointment.findMany({
        where: { tenantId, customer: { userId, tenantId } },
        include: appointmentInclude,
        orderBy: { startTime: 'desc' },
      })
    ).map(toAppointmentDto);
  }
}
