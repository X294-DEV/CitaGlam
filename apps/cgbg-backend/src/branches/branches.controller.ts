import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { UpdateBranchSchedulesDto } from './dto/business-schedule.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LimitsGuard } from '../subscriptions/guards/limits.guard';
import { CheckLimit } from '../subscriptions/decorators/check-limit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, LimitsGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @CheckLimit('maxBranches')
  async create(@Body() dto: CreateBranchDto, @CurrentUser() user: any) {
    return this.branchesService.createBranch(dto, user.tenantId);
  }

  @Get('mine')
  async getMyBranch(@CurrentUser() user: any) {
    return this.branchesService.findFirst(user.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branchesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: any,
  ) {
    return this.branchesService.updateBranch(id, dto, user.tenantId);
  }

  // --- Schedules ---

  @Get(':id/schedules')
  async getSchedules(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branchesService.getSchedules(id, user.tenantId);
  }

  @Post(':id/schedules')
  async upsertSchedules(
    @Param('id') id: string,
    @Body() dto: UpdateBranchSchedulesDto,
    @CurrentUser() user: any,
  ) {
    return this.branchesService.upsertSchedules(id, dto.schedules, user.tenantId);
  }

  @Put(':id/schedules')
  async updateSchedules(
    @Param('id') id: string,
    @Body() dto: UpdateBranchSchedulesDto,
    @CurrentUser() user: any,
  ) {
    return this.branchesService.upsertSchedules(id, dto.schedules, user.tenantId);
  }

  // --- Exceptions ---

  @Get(':id/exceptions')
  async getExceptions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branchesService.getExceptions(id, user.tenantId);
  }

  @Post(':id/exceptions')
  async addException(
    @Param('id') id: string,
    @Body() dto: CreateExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.branchesService.addException(id, dto, user.tenantId);
  }

  @Delete('exceptions/:id')
  async removeException(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branchesService.removeException(id, user.tenantId);
  }
}
