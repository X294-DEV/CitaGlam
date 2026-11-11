import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { EmailProvider } from '@cgbg/email';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  async registerBusiness(dto: RegisterBusinessDto) {
    // 1. Check if slug exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });

    if (existingTenant) {
      throw new ConflictException('El slug del negocio ya está en uso.');
    }

    // 2. Check if admin email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo del administrador ya está registrado.');
    }

    // 3. Verify Package
    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException('El paquete de suscripción no existe.');
    }

    // 4. Start Transaction
    const hashedPassword = await argon2.hash(dto.password);
    const activationToken = crypto.randomBytes(32).toString('hex');

    return this.prisma.$transaction(async (tx) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName,
          slug: dto.slug.toLowerCase(),
          packageId: dto.packageId,
          isActive: true,
        },
      });

      // Create Initial Config
      await tx.tenantConfig.create({
        data: {
          tenantId: tenant.id,
          primaryColor: '#3B82F6', // Default blue
          welcomeMessage: `¡Bienvenido a ${dto.businessName}!`,
        },
      });

      // Create Default Branch (Automatic as requested)
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Sucursal Principal',
          address: 'Dirección por completar', // Admin can update later
        },
      });

      // Create Admin User
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: false, // Must activate
          activationToken,
        },
      });

      // Send Activation Email
      const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/activate?token=${activationToken}`;
      await this.emailProvider.sendEmail({
        to: user.email,
        subject: `Activa tu cuenta de Administrador - ${dto.businessName}`,
        template: 'activation',
        context: {
          user_name: user.firstName,
          magic_link: activationUrl,
          business_name: dto.businessName,
        },
      });

      return {
        tenantId: tenant.id,
        adminId: user.id,
        branchId: branch.id,
        message: 'Negocio registrado exitosamente. Por favor, activa tu cuenta de administrador.',
      };
    });
  }

  async getPublicConfig(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: { config: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Negocio no encontrado o inactivo.');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      config: tenant.config,
    };
  }

  async getPublicBranches(slug: string) {
    const tenant = await this.findActiveTenantBySlug(slug);
    return this.prisma.branch.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });
  }

  async getPublicServices(slug: string) {
    const tenant = await this.findActiveTenantBySlug(slug);
    return this.prisma.service.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  private async findActiveTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Negocio no encontrado o inactivo.');
    }
    return tenant;
  }
}
