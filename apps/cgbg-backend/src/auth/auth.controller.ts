import { Throttle } from '@nestjs/throttler';
import { RATE_LIMITS } from '../config/rate-limits';
import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateBusinessRequestDto } from '../admin/dto/create-business-request.dto';
import { AdminService } from '../admin/admin.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Get('config/public')
  @HttpCode(HttpStatus.OK)
  async getPublicConfig() {
    return this.adminService.getPublicConfig();
  }

  @Throttle(RATE_LIMITS.authSensitive)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(RATE_LIMITS.login)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }

  @Throttle(RATE_LIMITS.authSensitive)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle(RATE_LIMITS.authSensitive)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Throttle(RATE_LIMITS.enumeration)
  @Get('check-client/:email')
  @HttpCode(HttpStatus.OK)
  async checkClient(@Param('email') email: string) {
    return this.authService.checkClientByEmail(email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  @Throttle(RATE_LIMITS.publicUpload)
  @Post('complete-express-activation')
  @HttpCode(HttpStatus.OK)
  async completeExpressActivation(@Body() body: { token: string; password: string }) {
    return this.authService.completeExpressActivation(body.token, body.password);
  }

  @Throttle(RATE_LIMITS.authSensitive)
  @Post('resend-activation')
  @HttpCode(HttpStatus.OK)
  async resendActivation(@Body() body: { email: string }) {
    return this.authService.resendActivationToken(body.email);
  }

  // --- Public Business Request Routes ---

  @Throttle(RATE_LIMITS.authSensitive)
  @Post('register-request')
  @HttpCode(HttpStatus.CREATED)
  async registerRequest(@Body() dto: CreateBusinessRequestDto) {
    return this.adminService.submitBusinessRequest(dto);
  }

  @Throttle(RATE_LIMITS.publicUpload)
  @Post('upload-payment-evidence/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPaymentEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.adminService.uploadRequestEvidence(id, file);
  }

  @Throttle(RATE_LIMITS.enumeration)
  @Get('business-request/:id')
  @HttpCode(HttpStatus.OK)
  async getBusinessRequest(@Param('id') id: string) {
    return this.adminService.getPublicBusinessRequest(id);
  }
}
