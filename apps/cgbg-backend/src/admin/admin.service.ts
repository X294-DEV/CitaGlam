import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { PrismaService } from '@cgbg/prisma';
import { EmailProvider } from '@cgbg/email';
import { Role } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateExpressTenantDto } from './dto/create-express-tenant.dto';
import { TestEmailConfigDto } from './dto/test-email-config.dto';
import { CreateBusinessRequestDto } from './dto/create-business-request.dto';
import { SendProposalDto } from './dto/send-proposal.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationActionType } from '@prisma/client';
import * as crypto from 'crypto';

interface GlobalConfigUpdateDto {
  gracePeriodDays?: number;
  reminderHours?: number;
  maintenanceMode?: boolean;
  bankDetails?: Record<string, string | number | boolean | null>;
  branding?: Record<string, string | number | boolean | null>;
  emailConfig?: Record<string, string | number | boolean | null>;
  localization?: Record<string, string | number | boolean | null>;
  security?: Record<string, string | number | boolean | null>;
  seo?: Record<string, string | number | boolean | null>;
  legal?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
    private notificationsService: NotificationsService,
  ) {}

  async getStats() {
    // 1. Core metrics
    const totalTenants = await this.prisma.tenant.count();
    const activeTenants = await this.prisma.tenant.count({
      where: { isActive: true },
    });
    const totalRevenue = await this.prisma.subscriptionPayment.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });
    const pendingPaymentsCount = await this.prisma.subscriptionPayment.count({
      where: { status: 'PENDING' },
    });

    // 2. Aggregate Data for Trends (Last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const [payments, rawDistribution, registrationTrend] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where: {
          createdAt: { gte: twelveMonthsAgo },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        select: {
          createdAt: true,
          amount: true,
          status: true,
        },
      }),
      this.prisma.tenant.groupBy({
        by: ['packageId'],
        _count: { id: true },
      }),
      this.prisma.tenant.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    // 3. Process Package Distribution
    const packageInfo = await this.prisma.subscriptionPackage.findMany({
      select: { id: true, name: true },
    });

    const packageDistribution = rawDistribution.map((d) => ({
      name: packageInfo.find((p) => p.id === d.packageId)?.name || 'Desconocido',
      count: d._count.id,
    }));

    // 4. Process Time Series in Memory
    const revenueTrends = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthLabel = targetDate.toLocaleString('es-MX', { month: 'short' });
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();

      // Net Revenue (Approved)
      const net = payments
        .filter(
          (p) =>
            p.status === 'APPROVED' &&
            p.createdAt.getFullYear() === year &&
            p.createdAt.getMonth() === month,
        )
        .reduce((acc, p) => acc + Number(p.amount), 0);

      // Gross Revenue (Approved + Pending)
      const gross = payments
        .filter(
          (p) =>
            p.createdAt.getFullYear() === year &&
            p.createdAt.getMonth() === month,
        )
        .reduce((acc, p) => acc + Number(p.amount), 0);

      const newTenants = registrationTrend.filter(
        (t) =>
          t.createdAt.getFullYear() === year &&
          t.createdAt.getMonth() === month,
      ).length;

      revenueTrends.push({
        label: monthLabel.toUpperCase(),
        net,
        gross,
        newTenants,
      });
    }

    return {
      metrics: {
        totalTenants,
        activeTenants,
        totalRevenue: Number(totalRevenue._sum.amount) || 0,
        pendingPayments: pendingPaymentsCount,
        currency: 'MXN',
      },
      revenueTrends,
      packageDistribution,
    };
  }

  async findAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        package: true,
        users: {
          select: { password: true, email: true, role: true }
        },
        _count: {
          select: { users: true, branches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map(t => {
      // Un negocio es "pendiente" si:
      // 1. Está inactivo
      // 2. Tiene algún usuario sin contraseña (independiente del rol)
      // 3. No tiene usuarios registrados todavía
      const hasPendingAdmin = t.users.some(u => !u.password);
      const hasNoUsers = t._count.users === 0;
      
      return {
        ...t,
        isPending: !t.isActive || hasPendingAdmin || hasNoUsers
      };
    });
  }

  async createTenant(dto: CreateTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingTenant) {
      throw new ConflictException('El slug del negocio ya está en uso.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        'El correo del administrador ya está registrado.',
      );
    }

    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) throw new NotFoundException('Paquete no encontrado.');

    const activationToken = crypto.randomBytes(32).toString('hex');
    const trialDays = pkg.trialDays || 30;
    const expiryDate = addDays(new Date(), trialDays);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          packageId: dto.packageId,
          subscriptionExpiresAt: expiryDate,
          config: {
            create: {
              primaryColor: '#4A8E8A',
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.adminEmail,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName || '',
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: false,
          activationToken,
        },
      });

      return { tenant, user };
    });

    // Send Activation Email
    const activationUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:4200'
    }/auth/activate?token=${activationToken}`;

    await this.emailProvider.sendEmail({
      to: dto.adminEmail,
      subject: `Bienvenido a CGBG - Activa tu negocio: ${dto.name}`,
      template: 'activation',
      context: {
        user_name: dto.adminFirstName,
        magic_link: activationUrl,
        business_name: dto.name,
      },
    });

    return result;
  }

  async createExpressTenant(dto: CreateExpressTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingTenant) {
      throw new ConflictException('El slug del negocio ya está en uso.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        'El correo del administrador ya está registrado.',
      );
    }

    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) throw new NotFoundException('Paquete no encontrado.');

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = addDays(new Date(), 1); // 24 hours
    const expiryDate = addMonths(new Date(), dto.monthsCount);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          packageId: dto.packageId,
          subscriptionExpiresAt: expiryDate,
          lastPaymentAt: new Date(),
          config: {
            create: {
              primaryColor: '#4A8E8A',
            },
          },
        },
      });

      // 2. Create Admin User (Inactive)
      const user = await tx.user.create({
        data: {
          email: dto.adminEmail,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName || '',
          role: 'ADMIN',
          tenantId: tenant.id,
          isActive: false,
          activationToken,
          activationExpires,
        },
      });

      // 3. Create Default Branch
      await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Sucursal Principal',
          address: 'Dirección por configurar',
          city: 'Ciudad por configurar',
        },
      });

      // 4. Create Approved Payment
      await tx.subscriptionPayment.create({
        data: {
          tenantId: tenant.id,
          packageId: dto.packageId,
          amount: dto.amount,
          monthsCount: dto.monthsCount,
          status: 'APPROVED',
          approvedAt: new Date(),
          adminNotes: 'Alta Express Realizada por Super Admin',
        },
      });

      return { tenant, user };
    });

    // 5. Send Invitation Email (Step 1)
    const setupUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:4200'
    }/auth/setup-password?token=${activationToken}`;

    await this.emailProvider.sendEmail({
      to: dto.adminEmail,
      subject: `Invitación: Configura tu acceso a ${dto.name} - CGBG`,
      template: 'express-invitation',
      context: {
        user_name: dto.adminFirstName,
        business_name: dto.name,
        system_name: 'CGBG',
        action_button: `<a href="${setupUrl}" style="background-color: #2D4A47; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Configurar Contraseña</a>`,
      },
    });

    return result;
  }

  async toggleTenantStatus(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { users: { where: { role: 'ADMIN' } } }
    });

    if (!tenant) throw new NotFoundException('Negocio no encontrado.');

    const newStatus = !tenant.isActive;
    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: newStatus },
    });

    // Notify Business Administrator
    const adminUser = tenant.users[0];
    if (adminUser) {
      await this.emailProvider.sendEmail({
        to: adminUser.email,
        subject: newStatus
          ? `Tu cuenta ha sido reactivada - ${tenant.name}`
          : `Tu cuenta ha sido suspendida - ${tenant.name}`,
        template: 'generic-notification',
        context: {
          user_name: adminUser.firstName,
          business_name: tenant.name,
          message: newStatus
            ? 'Nos complace informarte que tu cuenta ha sido reactivada. Ya puedes acceder nuevamente a todas las funcionalidades del sistema.'
            : 'Te informamos que tu cuenta ha sido suspendida temporalmente por el administrador del sistema. Si crees que esto es un error, por favor contacta a soporte.',
        },
      });
    }

    return updatedTenant;
  }

  async updateTenant(id: string, dto: Partial<CreateTenantDto>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado.');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        packageId: dto.packageId,
      },
      include: { package: true },
    });
  }

  async resendInvitation(tenantId: string, email?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { 
        users: { 
          where: { role: Role.ADMIN } 
        } 
      }
    });

    if (!tenant) throw new NotFoundException('Negocio no encontrado.');
    
    let adminUser = tenant.users.find(u => !u.password) || tenant.users[0];

    // Case: Admin was deleted (Orphaned Tenant)
    if (!adminUser) {
      if (!email) {
        throw new ConflictException('RECOVERY_REQUIRED');
      }

      // Check if email belongs to another registered user
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictException('El correo proporcionado ya está vinculado a otro usuario del sistema.');
      }

      // Create new administrator for this tenant
      adminUser = await this.prisma.user.create({
        data: {
          email,
          firstName: 'Administrador',
          lastName: 'Recuperado',
          role: Role.ADMIN,
          tenantId: tenant.id,
          isActive: false
        }
      });
    }

    // Refresh token and expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpires = addDays(new Date(), 1); // 24 hours

    await this.prisma.user.update({
      where: { id: adminUser.id },
      data: {
        activationToken: newToken,
        activationExpires: newExpires
      }
    });

    // Send invitation email
    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/setup-password?token=${newToken}`;
    
    await this.emailProvider.sendEmail({
      to: adminUser.email,
      template: 'express-invitation',
      subject: `Configura tu acceso a ${tenant.name} - CitaGlam`,
      context: {
        user_name: adminUser.firstName,
        business_name: tenant.name,
        cta_text: 'Configurar Contraseña',
        magic_link: setupUrl,
      },
    });

    return { success: true, message: 'Invitación reenviada exitosamente.' };
  }

  async getConfig() {
    const config = await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
    });

    const defaultConfig = {
      id: 'SYSTEM',
      gracePeriodDays: 3,
      reminderHours: 24,
      maintenanceMode: false,
      bankDetails: {},
      branding: { systemName: 'CGBG Software' },
      emailConfig: {},
      localization: { currency: 'MXN', timezone: 'America/Mexico_City' },
      emailTemplates: {
        activation: {
          subject: 'Activación de Cuenta Corporativa - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Bienvenido a la Plataforma</h2><p>Estimado(a) {{user_name}},</p><p>Le damos la más cordial bienvenida a <strong>{{system_name}}</strong>. Hemos recibido su solicitud de registro y su cuenta ha sido creada exitosamente.</p><p>Para garantizar la seguridad de su información y activar sus credenciales de acceso, es necesario que confirme su dirección de correo electrónico:</p>{{action_button}}<p>Atentamente,<br><strong>Departamento de Seguridad - {{system_name}}</strong></p>',
        },
        'appointment-requested': {
          subject: 'Solicitud de Servicio Recibida - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Notificación de Solicitud</h2><p>Estimado(a) {{user_name}},</p><p>Le informamos que hemos recibido satisfactoriamente su solicitud de reservación para el servicio: <strong>{{service_name}}</strong>.</p><p>Nuestro equipo operativo está revisando la disponibilidad para la fecha solicitada.</p>',
        },
        'appointment-confirmation': {
          subject: 'Confirmación de Cita Programada - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Cita Confirmada</h2><p>Estimado(a) {{user_name}},</p><p>Es un placer informarle que su cita ha sido <strong>confirmada y agendada</strong> en nuestro sistema operativo.</p><p>A continuación se presentan los detalles de su atención:</p>{{appointment_summary}}<p>Esperamos verle pronto.</p>',
        },
        'appointment-cancelled': {
          subject: 'Cancelación de Servicio - {{system_name}}',
          body: '<h2 style="color: #E11D48;">Aviso de Cancelación</h2><p>Estimado(a) {{user_name}},</p><p>Le informamos formalmente que su cita programada para el servicio <strong>{{service_name}}</strong> ha sido cancelada.</p>',
        },
        'appointment-rescheduled': {
          subject: 'Actualización de Agenda: Cita Reprogramada - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Reprogramación de Cita</h2><p>Estimado(a) {{user_name}},</p><p>Le notificamos que su cita ha sido <strong>reprogramada</strong> exitosamente. Por favor, tome nota de los nuevos detalles de su atención:</p>{{appointment_summary}}<p>Los demás detalles permanecen sin cambios.</p>',
        },
        'payment-receipt': {
          subject: 'Comprobante Electrónico de Operación - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Confirmación de Pago</h2><p>Estimado(a) {{user_name}},</p><p>Agradecemos su confianza en nuestros servicios. Confirmamos que hemos recibido satisfactoriamente su pago correspondiente a la suscripción:</p>{{payment_summary}}<p>Gracias por ser parte de {{system_name}}.</p>',
        },
        'express-invitation': {
          subject: 'Invitación: Configura tu acceso a {{business_name}} - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">¡Bienvenido a la Plataforma!</h2><p>Estimado(a) {{user_name}},</p><p>Has sido invitado por el administrador para gestionar el negocio <strong>{{business_name}}</strong> en nuestra plataforma SaaS.</p><p>Para comenzar y tomar el control de tu panel de administración, por favor configura tu contraseña accediendo al siguiente enlace seguro (vence en 24 horas):</p>{{action_button}}<p>Si no esperabas esta invitación, puedes ignorar este correo.</p>',
        },
        'welcome-active': {
          subject: '¡Tu negocio ya está activo! Bienvenidos a {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">¡Todo Listo!</h2><p>Hola de nuevo {{user_name}},</p><p>Tu cuenta ha sido configurada correctamente y el negocio <strong>{{business_name}}</strong> ya está activo y 100% operativo en nuestro ecosistema.</p><p>A partir de este momento puedes acceder a tu dashboard, configurar tus servicios y comenzar a recibir citas.</p><p>Estamos aquí para ayudarte a crecer.</p>',
        },
        'reset-password': {
          subject: 'Recuperación de Contraseña - {{system_name}}',
          body: '<h2 style="color: #1A3E3B;">Restablecer Contraseña</h2><p>Estimado(a) {{user_name}},</p><p>Hemos recibido una solicitud para restablecer la contraseña vinculada a tu cuenta en <strong>{{system_name}}</strong>.</p><p>Para proceder con el cambio, por favor haz clic en el siguiente botón (este enlace vence en 24 horas):</p>{{action_button}}<p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>',
        },
        'new-lead': {
          subject: 'Nuevo Lead: Solicitud de Registro - {{business_name}}',
          body: '<h2 style="color: #1A3E3B;">Nueva Solicitud Recibida</h2><p>Estimado Administrador,</p><p>Se ha registrado un nuevo lead interesado en la plataforma <strong>{{system_name}}</strong>:</p><ul><li><strong>Nombre:</strong> {{prospect_name}}</li><li><strong>Email:</strong> {{prospect_email}}</li><li><strong>Teléfono:</strong> {{prospect_phone}}</li><li><strong>Negocio:</strong> {{business_name}}</li></ul><p>Por favor, ingresa al panel administrativo para gestionar esta solicitud y enviar una propuesta.</p>',
        },
        'business-proposal': {
          subject: 'Propuesta Personalizada CitaGlam - {{business_name}}',
          body: '<h2 style="color: #1A3E3B;">Tu Propuesta de Negocio</h2><p>Hola <strong>{{user_name}}</strong>,</p><p>Ha sido un gusto conversar contigo sobre el futuro de <strong>{{business_name}}</strong>.</p><p>Tras analizar tus necesidades, te presentamos nuestra propuesta:</p><ul><li><strong>Paquete:</strong> {{package_name}}</li><li><strong>Vigencia:</strong> {{months_count}} Mes(es)</li><li><strong>Inversión:</strong> {{negotiated_price}}</li></ul><h3 style="color: #2D4A47;">Instrucciones de Pago</h3><p>Para activar tu plataforma, realiza la transferencia a los siguientes datos:</p><ul><li><strong>Banco:</strong> {{bank_name}}</li><li><strong>CLABE:</strong> {{clabe}}</li><li><strong>Referencia:</strong> {{reference}}</li></ul><p>Una vez realizado el pago, sube tu comprobante haciendo clic en el siguiente botón:</p>{{action_button}}',
        },
        'payment-proof-uploaded': {
          subject: '[CitaGlam] Comprobante de Pago Recibido - {{business_name}}',
          body: '<h2 style="color: #1A3E3B;">Nuevo Comprobante Recibido</h2><p>Hola <strong>{{admin_name}}</strong>,</p><p>Se ha recibido un nuevo comprobante de pago para la solicitud de activación de negocio.</p><div style="background: #F8FAFC; padding: 25px; border-radius: 12px; border: 1px solid #E2E8F0; margin: 25px 0;"><p style="margin: 5px 0;"><strong>Negocio:</strong> {{business_name}}</p><p style="margin: 5px 0;"><strong>Cliente:</strong> {{client_name}}</p></div><p>Por favor, ingresa al panel administrativo para verificar el documento y activar el Tenant correspondiente.</p>{{action_button}}',
        },
      },
      legal: {},
      seo: {},
      security: { turnstileSiteKey: '', turnstileSecretKey: '' },
    };

    if (!config) return defaultConfig;
    
    const savedTemplates = (config.emailTemplates as Record<string, any>) || {};
    const defaultTemplates = defaultConfig.emailTemplates as Record<string, any>;
    const healedTemplates: Record<string, any> = {};

    // Heal & Merge logic
    Object.keys(defaultTemplates).forEach(key => {
      const saved = savedTemplates[key];
      const def = defaultTemplates[key];
      
      if (!saved) {
        healedTemplates[key] = def;
      } else {
        // Si la de defecto requiere botón, verificamos que la guardada lo tenga (usando regex para mayor robustez)
        const buttonRegex = /\{\{\s*action_button\s*\}\}/;
        const needsButton = buttonRegex.test(def.body);
        const hasButton = buttonRegex.test(saved.body);
        
        if (needsButton && !hasButton) {
          healedTemplates[key] = {
            ...saved,
            body: def.body // Restaurar cuerpo sano
          };
        } else {
          healedTemplates[key] = saved;
        }
      }
    });

    return {
      ...config,
      emailTemplates: healedTemplates,
    };
  }

  async getPublicConfig() {
    const config = await this.getConfig();
    const branding = config.branding as any || {};
    const security = config.security as any || {};

    return {
      systemName: branding.systemName || 'CGBG Software',
      turnstileSiteKey: security.turnstileSiteKey || '1x00000000000000000000AA', // Default testing key if not set
    };
  }

  async updateConfig(dto: GlobalConfigUpdateDto) {
    const currentConfig = (await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
    })) as any;

    const updateData: Record<string, any> = {};
    if (dto.gracePeriodDays !== undefined) {
      updateData.gracePeriodDays = dto.gracePeriodDays;
    }
    if (dto.reminderHours !== undefined) {
      updateData.reminderHours = dto.reminderHours;
    }
    if (dto.maintenanceMode !== undefined) {
      updateData.maintenanceMode = dto.maintenanceMode;
    }

    const base = currentConfig || {
      bankDetails: {},
      branding: {},
      emailConfig: {},
      localization: {},
      emailTemplates: {},
      legal: {},
      seo: {},
      security: {},
    };

    if (dto.bankDetails) {
      updateData.bankDetails = {
        ...(base.bankDetails as Record<string, any>),
        ...dto.bankDetails,
      };
    }
    if (dto.branding) {
      updateData.branding = {
        ...(base.branding as Record<string, any>),
        ...dto.branding,
      };
    }
    if (dto.emailConfig) {
      updateData.emailConfig = {
        ...(base.emailConfig as Record<string, any>),
        ...dto.emailConfig,
      };
    }
    if (dto.localization) {
      updateData.localization = {
        ...(base.localization as Record<string, any>),
        ...dto.localization,
      };
    }

    const extendedDto = dto as any;
    if (extendedDto.emailTemplates) {
      updateData.emailTemplates = {
        ...(base.emailTemplates as Record<string, any>),
        ...extendedDto.emailTemplates,
      };
    }
    if (extendedDto.legal) {
      updateData.legal = {
        ...(base.legal as Record<string, any>),
        ...extendedDto.legal,
      };
    }
    if (extendedDto.seo) {
      updateData.seo = {
        ...(base.seo as Record<string, any>),
        ...extendedDto.seo,
      };
    }
    if (extendedDto.security) {
      updateData.security = {
        ...(base.security as Record<string, any>),
        ...extendedDto.security,
      };
    }

    return this.prisma.globalConfig.upsert({
      where: { id: 'SYSTEM' },
      update: updateData,
      create: {
        id: 'SYSTEM',
        ...updateData,
      },
    });
  }

  async testEmailConfig(dto: TestEmailConfigDto) {
    const success = await this.emailProvider.verifyConnection(dto);
    if (!success) {
      throw new ConflictException(
        'No se pudo establecer conexión con el servidor SMTP. Verifica las credenciales.',
      );
    }

    await this.updateConfig({ emailConfig: dto as any });

    return {
      success: true,
      message:
        'Conexión SMTP verificada y CONFIGURACIÓN GUARDADA exitosamente por seguridad.',
    };
  }

  async getEmailPreview(body: string, subject: string) {
    const html = await this.emailProvider.renderPreview(body, subject);
    return { html };
  }

  async sendTestTemplate(to: string, subject: string, body: string) {
    const globalConfig = await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
      select: { branding: true }
    });

    const context = {
      user_name: 'Juan Pérez',
      user_email: to,
      business_name: 'Mi Negocio Demo',
      magic_link: '#',
      system_name: (globalConfig?.branding as any)?.systemName || 'CGBG',
      current_year: new Date().getFullYear().toString(),
      appointment_date: '15/10/2026',
      appointment_time: '14:00',
      service_name: 'Corte de Cabello Premium',
      payment_amount: '$450.00 MXN'
    };

    await this.emailProvider.sendEmail({
      to,
      subject,
      html: body,
      context
    });

    return { success: true, message: `Correo de prueba enviado exitosamente a ${to}` };
  }

  // --- Business Request Management ---

  async submitBusinessRequest(dto: CreateBusinessRequestDto) {
    const config = await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
    });
    const security = config?.security as any || {};
    const secretKey = security.turnstileSecretKey;

    // Turnstile verification if secretKey is configured
    if (secretKey) {
      if (!dto.turnstileToken) {
        throw new ConflictException('La verificación de seguridad es obligatoria.');
      }

      try {
        const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: secretKey,
            response: dto.turnstileToken,
          }),
        });

        const result = (await response.json()) as any;
        if (!result.success) {
          throw new ConflictException('Error en la verificación de seguridad (Captcha).');
        }
      } catch (e) {
        console.error('Turnstile Error:', e);
        if (e instanceof ConflictException) throw e;
        throw new ConflictException('Error al contactar con el servicio de seguridad.');
      }
    }
    
    const request = await this.prisma.businessRequest.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        businessName: dto.businessName,
        phone: dto.phone,
        status: 'PENDING'
      }
    });

    // Notify SuperAdmins
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: { role: Role.SUPERADMIN },
        select: { email: true }
      });
      
      const recipientEmails = superAdmins.length > 0 
        ? superAdmins.map(u => u.email) 
        : [process.env.SYSTEM_ADMIN_EMAIL || 'admin@citaglam.com'];

      for (const adminEmail of recipientEmails) {
        await this.emailProvider.sendEmail({
          to: adminEmail,
          subject: `Nuevo Lead: Solicitud de Registro - ${dto.businessName}`,
          template: 'new-lead',
          context: {
            prospect_name: dto.fullName,
            prospect_email: dto.email,
            prospect_phone: dto.phone,
            business_name: dto.businessName,
          }
        });
      }

      // Internal Notifications (Real-Time)
      try {
        const admins = await this.prisma.user.findMany({
          where: { role: Role.SUPERADMIN },
          select: { id: true }
        });

        for (const admin of admins) {
          await this.notificationsService.create({
            userId: admin.id,
            title: 'Nueva Solicitud de Negocio',
            message: `${dto.fullName} ha registrado "${dto.businessName}".`,
            type: NotificationType.SUCCESS,
            actionUrl: '/admin/saas/requests',
            actionType: NotificationActionType.INTERNAL_NAV
          });
        }
      } catch (notifyErr) {
        console.error('Failed to send in-app notifications', notifyErr);
      }
    } catch (e) {
      console.error('Error sending alert to SuperAdmin', e);
    }

    return request;
  }

  async findAllBusinessRequests() {
    return this.prisma.businessRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async sendNegotiatedProposal(id: string, dto: SendProposalDto) {
    const request = await this.prisma.businessRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');

    const pkg = await this.prisma.subscriptionPackage.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('Paquete no encontrado.');

    // Update request with negotiated terms
    await this.prisma.businessRequest.update({
      where: { id },
      data: {
        selectedPackageId: dto.packageId,
        monthsCount: dto.monthsCount,
        negotiatedPrice: dto.negotiatedPrice,
        status: 'PROPOSAL_SENT'
      }
    });

    // Send email with payment instructions and upload link
    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/upload-payment/${id}`;
    const bankDetails = (await this.getConfig()).bankDetails as any || {};

    // Send email with proposal using the new template
    await this.emailProvider.sendEmail({
      to: request.email,
      subject: `Propuesta Personalizada CitaGlam - ${request.businessName}`,
      template: 'business-proposal',
      context: {
        user_name: request.fullName,
        business_name: request.businessName,
        package_name: pkg.name,
        months_count: dto.monthsCount,
        negotiated_price: `$${dto.negotiatedPrice} MXN`,
        bank_name: bankDetails.bankName || 'N/A',
        clabe: bankDetails.clabe || 'N/A',
        account_number: bankDetails.accountNumber || 'N/A',
        account_holder: bankDetails.accountHolder || 'N/A',
        reference: request.businessName.slice(0, 10).toUpperCase(),
        cta_text: 'Subir Comprobante de Pago',
        magic_link: setupUrl,
      }
    });

    return { success: true };
  }

  async getPublicBusinessRequest(id: string) {
    const request = await this.prisma.businessRequest.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        status: true,
        selectedPackageId: true,
        fullName: true,
      }
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return request;
  }

  async uploadRequestEvidence(id: string, file: Express.Multer.File) {
    const request = await this.prisma.businessRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');

    // Security: Block if already uploaded or approved
    if (request.status === 'WAITING_APPROVAL' || request.status === 'APPROVED') {
      throw new BadRequestException('Esta solicitud ya tiene un comprobante en revisión o ya ha sido activada.');
    }

    // Validate MIME types
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 
      'image/gif', 'image/bmp', 'image/heic', 
      'image/heif', 'image/tiff', 'application/pdf'
    ];
    
    if (!file || !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Formato de archivo no permitido. Use JPG, PNG, WEBP o PDF.');
    }

    // Ensure uploads directory exists
    const uploadDir = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads', 'proofs');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `proof-${id}-${Date.now()}${extname(file.originalname)}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    writeFileSync(filePath, file.buffer);

    // Store the public URL
    const evidenceUrl = `/uploads/proofs/${fileName}`;

    const updatedRequest = await this.prisma.businessRequest.update({
      where: { id },
      data: {
        evidenceUrl,
        status: 'WAITING_APPROVAL'
      }
    });

    // Save proof to history
    await this.prisma.businessRequestProof.create({
      data: {
        businessRequestId: id,
        evidenceUrl: evidenceUrl,
        status: 'WAITING'
      }
    });

    // 1. Fetch SuperAdmins to notify
    const superAdmins = await this.prisma.user.findMany({
      where: { role: Role.SUPERADMIN, isActive: true },
      select: { id: true, email: true, firstName: true }
    });

    // 2. In-App Notifications
    for (const admin of superAdmins) {
      await this.notificationsService.create({
        userId: admin.id,
        title: 'Nuevo Comprobante Recibido',
        message: `El negocio "${request.businessName}" ha subido su comprobante de pago.`,
        type: NotificationType.INFO,
        actionUrl: '/admin/saas/requests',
        actionType: NotificationActionType.INTERNAL_NAV
      }).catch(err => console.error(`Error sending in-app notification to ${admin.id}:`, err));
    }

    // 3. Email Notification to SuperAdmins

    for (const admin of superAdmins) {
      await this.emailProvider.sendEmail({
        to: admin.email,
        subject: `[CitaGlam] Comprobante de Pago Recibido - ${request.businessName}`,
        template: 'payment-proof-uploaded',
        context: {
          admin_name: admin.firstName,
          business_name: request.businessName,
          client_name: request.fullName,
          cta_url: `${process.env.ADMIN_URL || 'http://localhost:4200'}/admin-global/saas-requests`,
          cta_text: 'Ver Solicitudes',
          system_name: 'CitaGlam'
        }
      }).catch(err => console.error(`Error sending proof email to ${admin.email}:`, err));
    }

    return updatedRequest;
  }

  async approveBusinessRequest(id: string) {
    const request = await this.prisma.businessRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');

    if (request.status !== 'WAITING_APPROVAL' && request.status !== 'PROPOSAL_SENT') {
      throw new ConflictException('La solicitud no está en un estado válido para aprobación.');
    }

    if (!request.selectedPackageId || !request.negotiatedPrice || !request.monthsCount) {
      throw new ConflictException('La solicitud no tiene los términos de propuesta definidos.');
    }

    // Reuse createExpressTenant logic
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = addDays(new Date(), 1);
    const expiryDate = addMonths(new Date(), request.monthsCount);

    // Generate unique slug from business name
    const slug = request.businessName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: request.businessName,
          slug: `${slug}-${id.slice(0, 4)}`, // Ensure uniqueness
          packageId: request.selectedPackageId!,
          subscriptionExpiresAt: expiryDate,
          lastPaymentAt: new Date(),
          config: {
            create: { primaryColor: '#4A8E8A' },
          },
        },
      });

      // 2. Create User
      const user = await tx.user.create({
        data: {
          email: request.email,
          firstName: request.fullName.split(' ')[0] || 'Admin',
          lastName: request.fullName.split(' ').slice(1).join(' ') || '',
          role: Role.ADMIN,
          tenantId: tenant.id,
          isActive: false,
          activationToken,
          activationExpires,
        },
      });

      // 3. Create Approved Payment record
      await tx.subscriptionPayment.create({
        data: {
          tenantId: tenant.id,
          packageId: request.selectedPackageId!,
          amount: request.negotiatedPrice!,
          monthsCount: request.monthsCount!,
          status: 'APPROVED',
          evidenceUrl: request.evidenceUrl,
          approvedAt: new Date(),
          adminNotes: `Aprobado desde Solicitud Express ID: ${id}`,
        },
      });

      // 4. Update Request Status
      await tx.businessRequest.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      return { tenant, user };
    });

    // 5. Send Welcome & Setup Email
    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/setup-password?token=${activationToken}`;

    await this.emailProvider.sendEmail({
      to: request.email,
      subject: `¡Bienvenido a CitaGlam! Configura tu acceso a ${request.businessName}`,
      template: 'express-invitation',
      context: {
        user_name: request.fullName.split(' ')[0],
        business_name: request.businessName,
        system_name: 'CitaGlam',
        cta_text: 'Configurar Contraseña',
        cta_url: setupUrl,
      },
    });

    return result;
  }

  async rejectBusinessRequest(id: string, reason: string) {
    const request = await this.prisma.businessRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');

    if (request.status !== 'WAITING_APPROVAL') {
      throw new ConflictException('Solo se pueden rechazar solicitudes en espera de aprobación.');
    }

    // Update status back to PROPOSAL_SENT
    await this.prisma.businessRequest.update({
      where: { id },
      data: { 
        status: 'PROPOSAL_SENT',
        evidenceUrl: null, // Clear current evidence link in parent
        adminNotes: reason // Store general feedback
      }
    });

    // Update the history record
    const latestProof = await this.prisma.businessRequestProof.findFirst({
      where: { businessRequestId: id, status: 'WAITING' },
      orderBy: { createdAt: 'desc' }
    });

    if (latestProof) {
      await this.prisma.businessRequestProof.update({
        where: { id: latestProof.id },
        data: {
          status: 'REJECTED',
          adminNotes: reason
        }
      });
    }

    // Notify client via email with Magic Link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const uploadUrl = `${frontendUrl}/auth/upload-payment/${id}`;

    await this.emailProvider.sendEmail({
      to: request.email,
      subject: `Aviso sobre tu Solicitud - ${request.businessName}`,
      template: 'subscription-rejected',
      context: {
        businessName: request.businessName,
        reason: reason,
        system_name: 'CitaGlam',
        cta_text: 'Subir Comprobante de Nuevo',
        cta_url: uploadUrl
      }
    }).catch(err => console.error('Error sending rejection email:', err));

    return { success: true, message: 'Solicitud rechazada y cliente notificado.' };
  }

  async getBusinessRequestProofs(id: string) {
    return this.prisma.businessRequestProof.findMany({
      where: { businessRequestId: id },
      orderBy: { createdAt: 'desc' }
    });
  }
}
