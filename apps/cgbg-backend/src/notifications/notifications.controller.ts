import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN', 'STAFF')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.notificationsService.findAllByUser(req.user.id, req.user.tenantId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id, req.user.tenantId);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id, req.user.tenantId);
  }

  @Delete('clear-range/:days')
  clearRange(@Request() req: any, @Param('days') days: string) {
    return this.notificationsService.deleteByRange(req.user.id, req.user.tenantId, parseInt(days));
  }

  @Delete('all')
  deleteAll(@Request() req: any) {
    return this.notificationsService.deleteAll(req.user.id, req.user.tenantId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.delete(id, req.user.id, req.user.tenantId);
  }
}
