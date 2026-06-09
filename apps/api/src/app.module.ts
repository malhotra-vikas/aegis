import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { CredentialsService } from './credentials/credentials.service.js';
import { HealthController } from './health/health.controller.js';
import { MetaOAuthController } from './oauth/meta-oauth.controller.js';
import { MetaOAuthService } from './oauth/meta-oauth.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware.js';

@Module({
  controllers: [HealthController, MetaOAuthController],
  providers: [PrismaService, CredentialsService, MetaOAuthService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve tenant context for every route except liveness/health.
    consumer.apply(TenantContextMiddleware).exclude('health').forRoutes('*');
  }
}
