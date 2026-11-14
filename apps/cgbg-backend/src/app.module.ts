import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GLOBAL_RATE_LIMIT } from './config/rate-limits';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from '@cgbg/prisma';
import { TenantsModule } from './tenants/tenants.module';
import { ServicesModule } from './services/services.module';
import { BranchesModule } from './branches/branches.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminModule } from './admin/admin.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReceiptsModule } from './receipts/receipts.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [GLOBAL_RATE_LIMIT],
      errorMessage: 'Demasiadas peticiones. Espera un minuto e inténtalo de nuevo.',
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    ServicesModule,
    BranchesModule,
    AppointmentsModule,
    SubscriptionsModule,
    AdminModule,
    ClientsModule,
    DashboardModule,
    UsersModule,
    NotificationsModule,
    ReceiptsModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
