import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@cgbg/prisma';
import { LIMIT_KEY } from '../decorators/check-limit.decorator';

@Injectable()
export class LimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitKey = this.reflector.get<string>(LIMIT_KEY, context.getHandler());
    if (!limitKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      // If no tenant context, we can't check limits. 
      // Usually SuperAdmins don't have tenantId and are exempt.
      if (user?.role === 'SUPERADMIN') return true;
      throw new ForbiddenException('Contexto de negocio no encontrado para verificar límites.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { package: true },
    });

    if (!tenant || !tenant.package) {
      throw new ForbiddenException('Plan de suscripción no encontrado.');
    }

    const limits = tenant.package.limits as any;
    const maxAllowed = limits ? limits[limitKey] : null;

    // If limit is null or not set, assume unlimited or not restricted by this guard
    if (maxAllowed === null || maxAllowed === undefined || maxAllowed === -1) {
      return true;
    }

    const currentCount = await this.getCurrentCount(user.tenantId, limitKey);

    if (currentCount >= maxAllowed) {
      throw new ForbiddenException(
        `Límite alcanzado: Tu plan actual permite un máximo de ${maxAllowed} ${this.formatLimitName(limitKey)}. Por favor, mejora tu plan.`
      );
    }

    return true;
  }

  private async getCurrentCount(tenantId: string, limitKey: string): Promise<number> {
    switch (limitKey) {
      case 'maxBranches':
        return this.prisma.branch.count({ where: { tenantId } });
      case 'maxServices':
        return this.prisma.service.count({ where: { tenantId } });
      case 'maxUsers':
        return this.prisma.user.count({ where: { tenantId, role: { not: 'CLIENT' } } });
      default:
        return 0;
    }
  }

  private formatLimitName(key: string): string {
    switch (key) {
      case 'maxBranches': return 'sucursales';
      case 'maxServices': return 'servicios';
      case 'maxUsers': return 'usuarios de staff';
      default: return 'recursos';
    }
  }
}
