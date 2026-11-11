import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../libs/prisma/src/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-category.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // --- Category Management ---

  async findAllCategories(tenantId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async createCategory(dto: CreateServiceCategoryDto, tenantId: string) {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: {
        tenantId_name: { tenantId, name: dto.name },
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe una categoría con este nombre.');
    }

    return this.prisma.serviceCategory.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateServiceCategoryDto, tenantId: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category || category.tenantId !== tenantId) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: dto,
    });
  }

  async removeCategory(id: string, tenantId: string) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!category || category.tenantId !== tenantId) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    // Move all services in this category to "Sin Categoría" (null categoryId)
    await this.prisma.service.updateMany({
      where: { tenantId, categoryId: id },
      data: { categoryId: null }
    });

    // Soft delete category
    return this.prisma.serviceCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Service Management ---

  async findAll(tenantId: string, showInactive = false) {
    return this.prisma.service.findMany({
      where: {
        tenantId,
        ...(showInactive ? {} : { isActive: true }),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!service || service.tenantId !== tenantId) {
      throw new NotFoundException('Servicio no encontrado.');
    }

    return service;
  }

  async create(dto: CreateServiceDto, tenantId: string) {
    // 1. Check Subscription Limits
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { package: true },
    });

    if (!tenant) throw new NotFoundException('Negocio no encontrado.');

    const limits = tenant.package.limits as any;
    const maxServices = limits?.maxServices || 5;

    const currentServicesCount = await this.prisma.service.count({
      where: { tenantId, isActive: true },
    });

    if (currentServicesCount >= maxServices) {
      throw new BadRequestException(
        `Has alcanzado el límite de servicios permitidos para tu plan (${maxServices}). Actualiza tu suscripción para añadir más.`
      );
    }

    // 2. Validate category if provided
    if (dto.categoryId) {
      const cat = await this.prisma.serviceCategory.findUnique({ where: { id: dto.categoryId }});
      if (!cat || cat.tenantId !== tenantId) throw new NotFoundException('Categoría no válida.');
    }

    // 3. Create Service
    return this.prisma.service.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async update(id: string, dto: UpdateServiceDto, tenantId: string) {
    // Ensure ownership
    await this.findOne(id, tenantId);

    // Validate category if provided
    if (dto.categoryId) {
      const cat = await this.prisma.serviceCategory.findUnique({ where: { id: dto.categoryId }});
      if (!cat || cat.tenantId !== tenantId) throw new NotFoundException('Categoría no válida.');
    }

    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string, tenantId: string) {
    // Ensure ownership
    await this.findOne(id, tenantId);

    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
