import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@cgbg/prisma';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifica el token de Cloudflare Turnstile de los formularios públicos.
 * La clave secreta vive en la configuración global del SaaS
 * (`GlobalConfig.security.turnstileSecretKey`), igual que en la solicitud de
 * registro de negocio; no hay valor de respaldo.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verify(token: string | undefined): Promise<void> {
    const config = await this.prisma.globalConfig.findFirst({
      where: { id: 'SYSTEM' },
      select: { security: true },
    });
    const security = (config?.security ?? {}) as { turnstileSecretKey?: string };
    const secret = security.turnstileSecretKey;

    if (!secret) {
      // En producción nunca se omite el desafío: sin clave se rechaza.
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'La verificación de seguridad no está configurada.',
        );
      }
      this.logger.warn(
        'Turnstile sin clave secreta: verificación omitida (solo desarrollo).',
      );
      return;
    }

    if (!token) {
      throw new BadRequestException('Completa la verificación de seguridad.');
    }

    let success = false;
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(5000),
      });
      success = ((await res.json()) as { success?: boolean }).success === true;
    } catch (error) {
      this.logger.error(
        `No se pudo contactar a Turnstile: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo verificar la seguridad. Inténtalo de nuevo.',
      );
    }

    if (!success) {
      throw new BadRequestException(
        'La verificación de seguridad falló. Inténtalo de nuevo.',
      );
    }
  }
}
