import { requireEnv } from '../config/required-env';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '@cgbg/prisma';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailProvider } from '@cgbg/email';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('EmailProvider') private emailProvider: EmailProvider,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const hashedPassword = await argon2.hash(dto.password);
    const activationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        tenantId: dto.tenantId,
        role: 'CLIENT',
        isActive: false,
        activationToken,
      },
    });

    const activationUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:4200'
    }/auth/activate?token=${activationToken}`;

    await this.emailProvider.sendEmail({
      to: user.email,
      subject: 'Activa tu cuenta en CGBG',
      template: 'activation',
      context: {
        user_name: user.firstName,
        magic_link: activationUrl,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async activateAccount(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { activationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Token de activación inválido.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        activationToken: null,
      },
    });

    return { message: 'Cuenta activada exitosamente.' };
  }

  async completeExpressActivation(token: string, password: string) {
    const user = await (this.prisma.user as any).findFirst({
      where: {
        activationToken: token,
        activationExpires: { gt: new Date() },
      },
      include: {
        tenant: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('Token de activación inválido o expirado.');
    }

    const hashedPassword = await argon2.hash(password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActive: true,
        activationToken: null,
        activationExpires: null,
      },
    });

    // Step 2: Send Welcome Email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    await this.emailProvider.sendEmail({
      to: user.email,
      subject: `¡Tu negocio ya está activo! Bienvenidos a CGBG`,
      template: 'welcome-active',
      context: {
        user_name: user.firstName,
        business_name: user.tenant?.name || 'tu negocio',
        system_name: 'CGBG',
        cta_text: 'Ir a mi Panel',
        cta_url: `${frontendUrl}/auth/login`
      },
    });

    // Step 3: Generate tokens for immediate session
    const tokens = await this.getTokens(user.id, user.email, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return { 
      success: true, 
      message: 'Cuenta activada correctamente.',
      access_token: tokens.access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
      }
    };
  }

  async resendActivationToken(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true, message: 'Si el correo existe, se ha enviado un código.' };
    }

    if (user.isActive) {
      return { success: false, message: 'Esta cuenta ya se encuentra activa.' };
    }

    const activationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        activationToken,
        activationExpires: expires,
      },
    });

    const activationUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:4200'
    }/auth/activate-express?token=${activationToken}`;

    await this.emailProvider.sendEmail({
      to: user.email,
      subject: `Verificación de seguridad - ${user.tenant?.name || 'CitaGlam'}`,
      template: 'express-invitation',
      context: {
        user_name: user.firstName,
        business_name: user.tenant?.name || 'tu negocio',
        magic_link: activationUrl,
        cta_text: 'Verificar mi cuenta'
      },
    });

    return { success: true, message: 'Código de activación reenviado.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Regla de seguridad: No revelar si el correo existe
      return {
        message: 'Si el correo existe, se ha enviado una guía de recuperación.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24 horas de vigencia

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expires,
      },
    });

    const resetUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:4200'
    }/auth/reset-password?token=${resetToken}`;

    await this.emailProvider.sendEmail({
      to: user.email,
      subject: 'Recuperación de Contraseña - CitaGlam',
      template: 'reset-password',
      context: {
        user_name: user.firstName,
        magic_link: resetUrl,
        cta_text: 'Restablecer mi contraseña'
      },
    });

    return {
      message: 'Se ha enviado un correo para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token de recuperación inválido o expirado.',
      );
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        isActive: true, // Aseguramos que el usuario esté activo al recuperar pass
      },
    });

    // Auto-login: Generamos tokens inmediatamente
    const tokens = await this.getTokens(user.id, user.email, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return { 
      message: 'Contraseña restablecida exitosamente.',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isActive: true,
      }
    };
  }

  async login(dto: LoginDto) {
    const user = await (this.prisma.user as any).findUnique({
      where: { email: dto.email },
      include: {
        tenant: {
          include: {
            package: true,
          },
        },
      },
    });

    if (
      !user ||
      !user.password ||
      !(await argon2.verify(user.password, dto.password))
    ) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta no ha sido activada.');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        packageFeatures: (user as any).tenant?.package?.features || {},
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Acceso denegado');

    const tokenRecord = await (this.prisma.refreshToken as any).findFirst({
      where: { token: refreshToken, userId, revoked: false, expiresAt: { gt: new Date() } },
    });

    if (!tokenRecord) throw new UnauthorizedException('Token de refresco inválido o expirado');

    // Rotation: revoke old token and generate new ones
    await (this.prisma.refreshToken as any).update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const tokens = await this.getTokens(user.id, user.email, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  private async asyncGenerateToken(
    payload: any,
    secret: string,
    expiresIn: SignOptions['expiresIn'],
  ) {
    return this.jwtService.signAsync(
      { ...payload, jti: crypto.randomBytes(16).toString('hex') },
      { secret, expiresIn }
    );
  }

  private async getTokens(userId: string, email: string, role: string, tenantId: string | null) {
    const payload = { sub: userId, email, role, tenantId };
    const secret = requireEnv('JWT_SECRET');
    const accessExp = (process.env.JWT_ACCESS_EXPIRATION || '15m') as any;
    const refreshExp = (process.env.JWT_REFRESH_EXPIRATION || '7d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.asyncGenerateToken(payload, secret, accessExp),
      this.asyncGenerateToken(payload, secret, refreshExp),
    ]);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const expiresAt = new Date();
    // Default 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Clean up old revoked or expired tokens for this user to keep DB lean
    try {
      await (this.prisma.refreshToken as any).deleteMany({
        where: {
          OR: [
            { userId, revoked: true },
            { userId, expiresAt: { lt: new Date() } }
          ]
        }
      });
    } catch (e) {
      // Ignore cleanup errors
    }

    await (this.prisma.refreshToken as any).create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });
  }

  async checkClientByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, role: true },
    });

    if (user && user.role === 'CLIENT') {
      return {
        exists: true,
        firstName: user.firstName,
      };
    }

    return { exists: false };
  }
}
