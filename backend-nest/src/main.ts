import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Fallback only matters if CORS_ALLOWED_ORIGINS is unset entirely (.env.example
  // and .env both already set it correctly) — kept in sync with those so a
  // missing env var doesn't silently allow the old Vite dev server's port
  // while rejecting the actual current frontend (Next.js on :3000).
  app.enableCors({
    origin: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3000').split(','),
  });
  const port = process.env.PORT ?? 8001;
  await app.listen(port, '0.0.0.0');
  console.log(`SportsWorld NestJS backend listening on :${port}`);
}
bootstrap();
