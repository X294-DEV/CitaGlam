import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../config/rate-limits';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, CreatePublicAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { CaptchaService } from '../captcha/captcha.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly availabilityService: AvailabilityService,
    private readonly captcha: CaptchaService,
  ) {}

  @Get('available')
  @UseGuards(OptionalJwtAuthGuard)
  async getAvailableSlots(
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() user?: { tenantId: string | null; role: string },
  ) {
    const exclusionTenantId = user && ['ADMIN', 'STAFF'].includes(user.role)
      ? user.tenantId ?? undefined : undefined;
    return this.availabilityService.getAvailableSlots(
      query.branchId, query.serviceId, query.date,
      query.excludeAppointmentId, exclusionTenantId,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentsService.create(dto, user.tenantId);
  }

  // Límite por IP (ver config/rate-limits.ts) y desafío Cloudflare Turnstile:
  // el token se valida antes de tocar la base y se rechaza con 400 si es inválido.
  @Throttle(RATE_LIMITS.publicBooking)
  @Post('public')
  @HttpCode(HttpStatus.CREATED)
  async createPublic(@Body() dto: CreatePublicAppointmentDto) {
    await this.captcha.verify(dto.turnstileToken);
    return this.appointmentsService.createPublic(dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async findMyAppointments(@CurrentUser() user: any) {
    return this.appointmentsService.findAllByClient(user.id, user.tenantId);
  }

  @Get('merchant')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async findMerchantAppointments(@CurrentUser() user: any) {
    return this.appointmentsService.findAllByTenant(user.tenantId);
  }

  @Get('pending-approval')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async findPendingApproval(@CurrentUser() user: any) {
    return this.appointmentsService.findPendingApprovalByTenant(user.tenantId);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.appointmentsService.approve(id, user.tenantId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.appointmentsService.reject(id, user.tenantId, body?.reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.appointmentsService.cancel(id, user.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentsService.updateStatus(id, dto, user.tenantId);
  }

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentsService.reschedule(id, dto, user.tenantId);
  }
}
