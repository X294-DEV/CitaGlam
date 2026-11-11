import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '@cgbg/prisma';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailModule } from '@cgbg/email';

@Module({
  imports: [PrismaModule, SubscriptionsModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
