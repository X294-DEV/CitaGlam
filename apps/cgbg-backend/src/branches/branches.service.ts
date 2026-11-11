import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BusinessScheduleDto } from './dto/business-schedule.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async createBranch(dto: any, tenantId: string) {
    return this.prisma.branch.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findFirst(tenantId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId },
    });

    if (!branch) {
      throw new NotFoundException('No se encontró sucursal para este negocio.');
    }

    return branch;
  }

  async findOne(id: string, tenantId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.tenantId !== tenantId) {
      throw new NotFoundException('Sucursal no encontrada.');
    }

    return branch;
  }

  async updateBranch(id: string, dto: UpdateBranchDto, tenantId: string) {
    await this.findOne(id, tenantId);

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  // --- Schedules Management ---

  async getSchedules(branchId: string, tenantId: string) {
    await this.findOne(branchId, tenantId);

    return this.prisma.businessSchedule.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async upsertSchedules(branchId: string, schedules: BusinessScheduleDto[], tenantId: string) {
    await this.findOne(branchId, tenantId);

    // Use a transaction to update all 7 days (or provided days)
    return this.prisma.$transaction(
      schedules.map((s) =>
        this.prisma.businessSchedule.upsert({
          where: {
            dayOfWeek_branchId: {
              branchId,
              dayOfWeek: s.dayOfWeek,
            },
          },
          update: {
            openTime: s.openTime,
            closeTime: s.closeTime,
            openTime2: s.openTime2,
            closeTime2: s.closeTime2,
            isOpen: s.isOpen,
          },
          create: {
            branchId,
            dayOfWeek: s.dayOfWeek,
            openTime: s.openTime,
            closeTime: s.closeTime,
            openTime2: s.openTime2,
            closeTime2: s.closeTime2,
            isOpen: s.isOpen,
          },
        })
      )
    );
  }

  // --- Exceptions Management ---

  async addException(branchId: string, dto: CreateExceptionDto, tenantId: string) {
    await this.findOne(branchId, tenantId);

    return this.prisma.workException.create({
      data: {
        tenantId, // Scoped to tenant
        exceptionDate: new Date(dto.exceptionDate),
        reason: dto.reason,
        isFullDay: dto.isFullDay ?? true,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async getExceptions(branchId: string, tenantId: string) {
    await this.findOne(branchId, tenantId);
    
    // In our schema, WorkException is linked to Tenant, but for a multitenant calendar tool, 
    // we want to filter by the business context.
    return this.prisma.workException.findMany({
      where: { tenantId },
      orderBy: { exceptionDate: 'asc' },
    });
  }

  async removeException(id: string, tenantId: string) {
    const exception = await this.prisma.workException.findUnique({
      where: { id },
    });

    if (!exception || exception.tenantId !== tenantId) {
      throw new NotFoundException('Excepción no encontrada.');
    }

    return this.prisma.workException.delete({
      where: { id },
    });
  }
}
