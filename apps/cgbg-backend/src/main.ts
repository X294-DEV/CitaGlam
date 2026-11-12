import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { requireEnv } from './config/required-env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras de seguridad (antes de los archivos estáticos para que también
  // apliquen a /uploads). Se permite que el panel y el sitio público, que
  // están en otros orígenes, carguen archivos de /uploads como el logo.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  
  // Ensure uploads directory exists
  const uploadDir = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads', 'proofs');
  const receiptDir = join(process.cwd(), 'apps', 'cgbg-backend', 'uploads', 'receipts');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  if (!existsSync(receiptDir)) {
    mkdirSync(receiptDir, { recursive: true });
  }

  // Static Assets (Proofs, etc)
  app.useStaticAssets(join(process.cwd(), 'apps', 'cgbg-backend', 'uploads'), {
    prefix: '/uploads',
  });
  
  // Enable Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS solo para el panel (FRONTEND_URL) y el sitio público (WEB_URL).
  // Cada variable admite varios orígenes separados por comas.
  const allowedOrigins = [requireEnv('FRONTEND_URL'), requireEnv('WEB_URL')]
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running on: http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
