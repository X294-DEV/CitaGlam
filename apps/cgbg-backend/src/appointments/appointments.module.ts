import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AvailabilityService } from './availability.service';
import { PrismaModule } from '@cgbg/prisma';
import { EmailModule } from '@cgbg/email';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [PrismaModule, EmailModule, MessagingModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityService],
  exports: [AppointmentsService, AvailabilityService],
})
export class AppointmentsModule {}
