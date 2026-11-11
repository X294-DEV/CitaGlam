import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
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

  // Enable CORS for Frontend integration
  app.enableCors();

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running on: http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
