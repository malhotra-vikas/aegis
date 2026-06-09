import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // rawBody: needed to verify Stripe webhook signatures against the exact payload.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  // 3001: the web tier owns 3000.
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
