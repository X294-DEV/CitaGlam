import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Get('packages')
  async getPackages() {
    return await this.prisma.subscriptionPackage.findMany({
      orderBy: { price: 'asc' },
    });
  }
}
