import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { MerchantSubscriptionsController } from './merchant-subscriptions.controller';
import { AdminPackagesController } from './admin-packages.controller';
import { PromotionsController } from './promotions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { LimitsGuard } from './guards/limits.guard';
import { PrismaModule } from '../../../../libs/prisma/src/prisma.module';
import { EmailModule } from '../../../../libs/email/src/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [
    SubscriptionsController, 
    AdminSubscriptionsController, 
    MerchantSubscriptionsController,
    AdminPackagesController,
    PromotionsController
  ],
  providers: [SubscriptionsService, LimitsGuard],
  exports: [SubscriptionsService, LimitsGuard],
})
export class SubscriptionsModule {}
