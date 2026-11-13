import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN', 'STAFF')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics(@Request() req: any) {
    return this.dashboardService.getMetrics(req.user.tenantId);
  }

  @Get('revenue-chart')
  async getRevenueChart(@Request() req: any) {
    return this.dashboardService.getRevenueChart(req.user.tenantId);
  }

  @Get('service-stats')
  async getServiceStats(@Request() req: any) {
    return this.dashboardService.getServiceStats(req.user.tenantId);
  }
}
