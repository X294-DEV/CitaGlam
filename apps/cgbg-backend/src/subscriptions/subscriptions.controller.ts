import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrivateFileHeaders, resolveStoredFile, streamStoredFile } from '../receipts/stored-files';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private prisma: PrismaService) {}

  @Get('my-history')
  async getMyHistory(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return await this.prisma.subscriptionPayment.findMany({
      where: { tenantId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Comprobante de un pago de suscripción del propio negocio (tenant del JWT). */
  @Get('my-history/:paymentId/evidence')
  @UseGuards(RolesGuard, TenantGuard)
  @Roles('ADMIN', 'STAFF')
  @PrivateFileHeaders()
  async getMyEvidence(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: any,
  ) {
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { id: paymentId, tenantId: req.user.tenantId },
      select: { id: true, evidenceUrl: true },
    });
    if (!payment) throw new NotFoundException('Comprobante no encontrado.');
    return streamStoredFile(
      resolveStoredFile('proofs', payment.evidenceUrl),
      `comprobante-suscripcion-${payment.id}`,
    );
  }

  @Get('packages')
  async getPackages() {
    return await this.prisma.subscriptionPackage.findMany({
      orderBy: { price: 'asc' },
    });
  }
}
