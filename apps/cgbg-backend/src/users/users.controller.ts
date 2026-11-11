import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LimitsGuard } from '../subscriptions/guards/limits.guard';
import { CheckLimit } from '../subscriptions/decorators/check-limit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, LimitsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('staff')
  @Roles('ADMIN', 'SUPERADMIN')
  @CheckLimit('maxUsers')
  async createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: any) {
    return this.usersService.createStaff(dto, user.tenantId);
  }

  @Get('staff')
  @Roles('ADMIN', 'SUPERADMIN')
  async findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user.tenantId);
  }

  @Delete('staff/:id')
  @Roles('ADMIN', 'SUPERADMIN')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.removeStaff(id, user.tenantId);
  }
}
