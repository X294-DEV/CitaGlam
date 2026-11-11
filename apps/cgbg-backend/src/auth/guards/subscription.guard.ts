import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. SuperAdmins follow no limits
    if (!user || user.role === Role.SUPERADMIN) {
      return true;
    }

    // 2. Clients (End-users) don't need subscription check for merchant ops, 
    // but the Guard would be applied to Merchant/Operational routes.
    if (user.role === Role.CLIENT) {
      return true;
    }

    // 3. For Merchant roles (ADMIN, STAFF), check validity
    const status = await this.subscriptionsService.getSubscriptionStatus(user.tenantId);

    if (status.isExpired) {
      // Return 402 Payment Required for SaaS standard or 403
      throw new ForbiddenException({
        message: 'Su suscripción ha vencido. Por favor, realice un pago para continuar operando.',
        isExpired: true,
        expiresAt: status.expiresAt,
      });
    }

    // During Grace Period, status.isExpired is false, so it lets them through with status.inGracePeriod: true
    // We could add a header or log info here if needed.
    
    return true;
  }
}
