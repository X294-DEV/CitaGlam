import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPaymentDto } from './dto/subscription-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('merchant/subscriptions')
@UseGuards(JwtAuthGuard)
export class MerchantSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: any) {
    return this.subscriptionsService.getSubscriptionStatus(user.tenantId);
  }

  @Get('payments')
  async getMyPayments(@CurrentUser() user: any) {
    return this.subscriptionsService.findTenantPayments(user.tenantId);
  }

  @Post('request-payment')
  async requestPayment(
    @Body() dto: CreateSubscriptionPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.createPaymentRequest(user.tenantId, dto);
  }
}
