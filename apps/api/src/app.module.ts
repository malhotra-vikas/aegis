import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { PrismaService } from './prisma/prisma.service.js';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware.js';

@Module({
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve tenant context for every route except liveness/health.
    consumer.apply(TenantContextMiddleware).exclude('health').forRoutes('*');
  }
}
