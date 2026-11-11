import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { PrismaModule } from '@cgbg/prisma';
import { EmailModule } from '@cgbg/email';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  controllers: [AdminController, FinancialController],
  providers: [AdminService, FinancialService],
  exports: [AdminService, FinancialService],
})
export class AdminModule {}
