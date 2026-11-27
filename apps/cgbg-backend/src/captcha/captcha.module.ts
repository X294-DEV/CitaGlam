import { Module } from '@nestjs/common';
import { PrismaModule } from '@cgbg/prisma';
import { CaptchaService } from './captcha.service';

@Module({
  imports: [PrismaModule],
  providers: [CaptchaService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
