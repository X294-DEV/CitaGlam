import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { EmailProvider } from '@cgbg/email';
import {
  CreateSubscriptionPaymentDto,
  ProcessSubscriptionPaymentDto,
  PaymentStatus,
} from './dto/subscription-payment.dto';
import { CreatePackageDto, UpdatePackageDto } from './dto/package.dto';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import {
  addMonths,
  addDays,
  differenceInDays,
  isAfter,
  format,
} from 'date-fns';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  // --- Package Management ---

  async createPackage(dto: CreatePackageDto) {
    return this.prisma.subscriptionPackage.create({ data: dto });
  }

  async updatePackage(id: string, dto: UpdatePackageDto) {
    return this.prisma.subscriptionPackage.update({ where: { id }, data: dto });
  }

  async findAllPackages(onlyPublic = false) {
    return this.prisma.subscriptionPackage.findMany({
      where: onlyPublic ? { isPublic: true, isActive: true } : {},
      orderBy: { price: 'asc' },
    });
  }

  // --- Promotion Management ---

  async createPromotion(dto: CreatePromotionDto) {
    const code = dto.code.toUpperCase();

    const existing = await this.prisma.promotion.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`El código promocional "${code}" ya existe.`);
    }

    return this.prisma.promotion.create({
      data: {
        ...dto,
        code,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    let code = dto.code;
    if (code) {
      code = code.toUpperCase();
      const existing = await this.prisma.promotion.findFirst({
        where: { code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `El código promocional "${code}" ya está en uso por otro cupón.`,
        );
      }
    }

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        code,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async findAllPromotions() {
    return this.prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async validatePromotion(code: string) {
    const normalizedCode = code.toUpperCase();
    const promo = await this.prisma.promotion.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo) {
      throw new NotFoundException('El código introducido no existe.');
    }

    if (!promo.isActive) {
      throw new BadRequestException('Este cupón ha sido desactivado.');
    }

    if (promo.validUntil && isAfter(new Date(), promo.validUntil)) {
      throw new BadRequestException(
        'Este cupón ha expirado (vigencia agotada).',
      );
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException(
        'Este cupón ya no está disponible (límite de usos alcanzado).',
      );
    }

    return promo;
  }

  // --- Payment Requests ---

  async createPaymentRequest(
    tenantId: string,
    dto: CreateSubscriptionPaymentDto,
  ) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: dto.packageId },
    });
    if (!pkg) {
      throw new NotFoundException('Paquete no encontrado.');
    }

    // Calculate amount based on pricesByTerm if available
    const prices = (pkg.pricesByTerm as Record<string, number>) || {};
    let amount = Number(pkg.price) * dto.monthsCount;

    if (prices[dto.monthsCount.toString()]) {
      amount = Number(prices[dto.monthsCount.toString()]);
    }

    return this.prisma.subscriptionPayment.create({
      data: {
        tenantId,
        packageId: dto.packageId,
        amount,
        monthsCount: dto.monthsCount,
        evidenceUrl: dto.evidenceUrl,
        status: 'PENDING',
      },
    });
  }

  async processPayment(paymentId: string, dto: ProcessSubscriptionPaymentDto) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { tenant: true, package: true },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado.');
    if (payment.status !== 'PENDING') {
      throw new ConflictException('Este pago ya fue procesado.');
    }
    if (dto.status === PaymentStatus.REJECTED) {
      const updatedPayment = await this.prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED', adminNotes: dto.adminNotes },
      });

      // Notify Tenant Owner
      const owner = await this.prisma.user.findFirst({
        where: { tenantId: payment.tenantId, role: 'ADMIN' },
      });

      if (owner) {
        await this.emailProvider.sendEmail({
          to: owner.email,
          subject: `Suscripción Rechazada - ${payment.tenant.name}`,
          template: 'subscription-rejected',
          context: {
            businessName: payment.tenant.name,
            reason: dto.adminNotes || 'Comprobante no válido o ilegible.',
          },
        });
      }

      return updatedPayment;
    }

    // Logic for APPROVAL: Calculate Expiration and Proration
    const tenant = payment.tenant;
    const newPkg = payment.package;
    const now = new Date();

    let baseExpiration = now;
    if (
      tenant.subscriptionExpiresAt &&
      isAfter(tenant.subscriptionExpiresAt, now)
    ) {
      baseExpiration = tenant.subscriptionExpiresAt;
    }

    // --- PRORATION LOGIC (Upgrade Case) ---
    const currentPkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: tenant.packageId || '' },
    });

    let adjustedExpiresAt = baseExpiration;

    if (
      currentPkg &&
      Number(newPkg.price) > Number(currentPkg.price) &&
      isAfter(baseExpiration, now)
    ) {
      // It's an upgrade and they have remaining time
      const remainingDays = differenceInDays(baseExpiration, now);
      const oldDailyPrice = Number(currentPkg.price) / 30;
      const newDailyPrice = Number(newPkg.price) / 30;

      const creditValue = remainingDays * oldDailyPrice;
      const equivalentNewDays = Math.floor(creditValue / newDailyPrice);

      // Update expiration context: Instead of adding to baseExpiration,
      // we start from "Now + EquivalentDays" of the new plan
      adjustedExpiresAt = addDays(now, equivalentNewDays);
    }

    // Finally add the new months bought
    const finalExpiresAt = addMonths(adjustedExpiresAt, payment.monthsCount);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Payment Status
      const updatedPayment = await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED', approvedAt: now },
      });

      // 2. Update Tenant Plan and Expiry
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          packageId: newPkg.id,
          subscriptionExpiresAt: finalExpiresAt,
          lastPaymentAt: now,
        },
      });

      return updatedPayment;
    });

    // Notify Tenant Owner upon Approval
    const owner = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'ADMIN' },
    });

    if (owner) {
      this.emailProvider
        .sendEmail({
          to: owner.email,
          subject: `¡Suscripción Activada! - ${tenant.name}`,
          template: 'subscription-approved',
          context: {
            businessName: tenant.name,
            planName: payment.package.name,
            expiryDate: format(finalExpiresAt, 'dd/MM/yyyy'),
            monthsPaid: payment.monthsCount,
          },
        })
        .catch((err) =>
          console.error('Error sending approval notification email', err),
        );
    }

    return result;
  }

  async findPendingPayments() {
    return this.prisma.subscriptionPayment.findMany({
      where: { status: 'PENDING' },
      include: { tenant: true, package: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findTenantPayments(tenantId: string) {
    return this.prisma.subscriptionPayment.findMany({
      where: { tenantId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProcessedPayments() {
    return this.prisma.subscriptionPayment.findMany({
      where: { status: { not: 'PENDING' } },
      include: { tenant: true, package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscriptionStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { package: true },
    });

    if (!tenant) throw new NotFoundException('Negocio no encontrado.');

    // Fetch Grace Period from Global Config
    const config = await this.prisma.globalConfig.findUnique({
      where: { id: 'SYSTEM' },
    });
    const graceDays = config?.gracePeriodDays || 3;

    const now = new Date();
    const expiresAt = tenant.subscriptionExpiresAt;

    let isExpired = false;
    let inGracePeriod = false;

    if (expiresAt) {
      if (isAfter(now, expiresAt)) {
        isExpired = true;
        const graceEnd = addDays(expiresAt, graceDays);
        if (isAfter(graceEnd, now)) {
          inGracePeriod = true;
          isExpired = false; // Still technically accessible during grace
        }
      }
    } else {
      isExpired = true; // No expiration date means no subscription
    }

    return {
      package: tenant.package,
      expiresAt: tenant.subscriptionExpiresAt,
      isExpired,
      inGracePeriod,
      graceDaysRemaining:
        inGracePeriod && expiresAt
          ? differenceInDays(addDays(expiresAt, graceDays), now)
          : 0,
    };
  }
}
