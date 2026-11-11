import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ProcessSubscriptionPaymentDto } from './dto/subscription-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('pending')
  async getPendingPayments(@CurrentUser() user: User) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede gestionar pagos.',
      );
    }

    return this.subscriptionsService.findPendingPayments();
  }

  @Get('history')
  async getProcessedHistory(@CurrentUser() user: User) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede consultar el historial.',
      );
    }

    return this.subscriptionsService.findProcessedPayments();
  }

  @Patch('process/:id')
  async processPayment(
    @Param('id') id: string,
    @Body() dto: ProcessSubscriptionPaymentDto,
    @CurrentUser() user: User,
  ) {
    if (user.role !== Role.SUPERADMIN) {
      throw new UnauthorizedException(
        'Solo el SuperAdministrador puede procesar pagos.',
      );
    }

    return this.subscriptionsService.processPayment(id, dto);
  }
}
