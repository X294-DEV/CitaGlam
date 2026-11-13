import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN', 'STAFF')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.clientsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.clientsService.findOne(id, tenantId);
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.clientsService.createManual(tenantId, body);
  }
}
