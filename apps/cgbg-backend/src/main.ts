import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { requireEnv } from './config/required-env';
import { folderPath } from './receipts/stored-files';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras de seguridad. Se permite que el panel y el sitio público, que
  // están en otros orígenes, carguen respuestas de la API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Carpetas de comprobantes. Ya NO se sirven como estáticos (S0-05): solo se
  // entregan por endpoints autenticados (GET /receipts/:appointmentId/file,
  // GET /admin/global/proof-files/:fileName, GET /subscriptions/my-history/:paymentId/evidence).
  folderPath('receipts');
  folderPath('proofs');

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
