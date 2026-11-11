import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateExpressTenantDto } from './dto/create-express-tenant.dto';
import { TestEmailConfigDto } from './dto/test-email-config.dto';
import { SendProposalDto } from './dto/send-proposal.dto';

@Controller('admin/global')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  // Sync: Prioritizing Express Tenant Routes over standard ones

  @Get('stats')
  async getStats(@CurrentUser() user: { role: Role }) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede acceder a las métricas globales.',
      );
    }
    return this.adminService.getStats();
  }

  @Get('tenants')
  async findAllTenants(@CurrentUser() user: { role: Role }) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede gestionar los negocios.',
      );
    }
    return this.adminService.findAllTenants();
  }

  @Post('tenants/express')
  async createExpressTenant(
    @Body() dto: CreateExpressTenantDto,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede realizar el alta express de negocios.',
      );
    }
    return this.adminService.createExpressTenant(dto);
  }

  @Post('tenants')
  async createTenant(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede crear negocios.',
      );
    }
    return this.adminService.createTenant(dto);
  }

  @Patch('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTenantDto>,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede editar negocios.',
      );
    }
    return this.adminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/status')
  async toggleTenantStatus(
    @Param('id') id: string,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede suspender/activar negocios.',
      );
    }
    return this.adminService.toggleTenantStatus(id);
  }

  @Post('tenants/:id/resend-invitation')
  async resendInvitation(
    @Param('id') id: string,
    @Body() body: { email?: string },
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede reenviar invitaciones.',
      );
    }
    return this.adminService.resendInvitation(id, body.email);
  }

  @Get('config')
  async getConfig(@CurrentUser() user: { role: Role }) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede visualizar la configuración global.',
      );
    }
    return this.adminService.getConfig();
  }

  @Patch('config')
  async updateConfig(
    @Body()
    dto: {
      gracePeriodDays?: number;
      reminderHours?: number;
      bankDetails?: any;
      branding?: any;
      emailConfig?: any;
      emailTemplates?: any;
      seo?: any;
      legal?: any;
      localization?: any;
      maintenanceMode?: boolean;
    },
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede modificar la configuración global.',
      );
    }
    return this.adminService.updateConfig(dto);
  }
  @Get('ping')
  async ping() {
    return { status: 'ok', message: 'Admin Controller is alive' };
  }

  @Post('test-email')
  async testEmailConfig(
    @Body() dto: TestEmailConfigDto,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede realizar pruebas de correo.',
      );
    }
    return this.adminService.testEmailConfig(dto);
  }

  @Post('email-preview')
  async getEmailPreview(
    @Body() dto: { body: string; subject: string },
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede previsualizar plantillas.',
      );
    }
    return this.adminService.getEmailPreview(dto.body, dto.subject);
  }

  @Post('send-test-template')
  async sendTestTemplate(
    @Body() dto: { to: string; subject: string; body: string },
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede enviar correos de prueba.',
      );
    }
    return this.adminService.sendTestTemplate(dto.to, dto.subject, dto.body);
  }

  // --- Business Requests Management (SuperAdmin Only) ---

  @Get('business-requests')
  async findAllBusinessRequests(@CurrentUser() user: { role: Role }) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Solo el SuperAdministrador puede visualizar solicitudes.');
    }
    return this.adminService.findAllBusinessRequests();
  }

  @Post('business-requests/:id/proposal')
  async sendNegotiatedProposal(
    @Param('id') id: string,
    @Body() dto: SendProposalDto,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Solo el SuperAdministrador puede enviar propuestas.');
    }
    return this.adminService.sendNegotiatedProposal(id, dto);
  }

  @Post('business-requests/:id/approve')
  async approveBusinessRequest(
    @Param('id') id: string,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Solo el SuperAdministrador puede aprobar solicitudes.');
    }
    return this.adminService.approveBusinessRequest(id);
  }

   @Post('business-requests/:id/reject')
  async rejectBusinessRequest(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Solo el SuperAdministrador puede rechazar solicitudes.');
    }
    return this.adminService.rejectBusinessRequest(id, body.reason);
  }

  @Get('business-requests/:id/proofs')
  async getBusinessRequestProofs(
    @Param('id') id: string,
    @CurrentUser() user: { role: Role },
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException('Solo el SuperAdministrador puede ver el historial de pagos.');
    }
    return this.adminService.getBusinessRequestProofs(id);
  }
}
