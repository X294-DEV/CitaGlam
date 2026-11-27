import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PaymentLinkService } from './payment-link.service';

@Global()
@Module({
  providers: [PrismaService, PaymentLinkService],
  exports: [PrismaService, PaymentLinkService],
})
export class PrismaModule {}
