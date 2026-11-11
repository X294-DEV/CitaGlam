import { Controller, Get, Post, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(@Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new NotFoundException('Inquilino no reconocido.');
    return this.clientsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new NotFoundException('Inquilino no reconocido.');
    return this.clientsService.findOne(id, tenantId);
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new NotFoundException('Inquilino no reconocido.');
    return this.clientsService.createManual(tenantId, body);
  }
}
