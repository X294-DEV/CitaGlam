import { requireEnv } from '../config/required-env';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '@cgbg/prisma';
import { EmailModule } from '@cgbg/email';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    PassportModule,
    AdminModule,
    JwtModule.register({
      secret: requireEnv('JWT_SECRET'),
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
