import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LimitsGuard } from '../subscriptions/guards/limits.guard';
import { CheckLimit } from '../subscriptions/decorators/check-limit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, LimitsGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // --- Category Management ---

  @Get('categories')
  async findAllCategories(@CurrentUser() user: any) {
    return this.servicesService.findAllCategories(user.tenantId);
  }

  @Post('categories')
  async createCategory(
    @Body() dto: CreateServiceCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.createCategory(dto, user.tenantId);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateServiceCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.updateCategory(id, dto, user.tenantId);
  }

  @Delete('categories/:id')
  async removeCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.removeCategory(id, user.tenantId);
  }

  // --- Service Management ---

  @Post()
  @CheckLimit('maxServices')
  async create(
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.create(dto, user.tenantId);
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('showInactive') showInactive = 'false',
  ) {
    return this.servicesService.findAll(user.tenantId, showInactive === 'true');
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.softDelete(id, user.tenantId);
  }
}
