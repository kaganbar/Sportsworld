import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173').split(','),
  });
  const port = process.env.PORT ?? 8001;
  await app.listen(port, '0.0.0.0');
  console.log(`SportsWorld NestJS backend listening on :${port}`);
}
bootstrap();
