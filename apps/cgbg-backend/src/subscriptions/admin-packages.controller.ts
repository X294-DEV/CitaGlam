import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminPackagesController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async create(@Body() dto: CreatePackageDto) {
    return this.subscriptionsService.createPackage(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.subscriptionsService.updatePackage(id, dto);
  }

  @Get()
  async findAll() {
    return this.subscriptionsService.findAllPackages(false);
  }
}
