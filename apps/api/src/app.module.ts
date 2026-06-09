import { Module } from '@nestjs/common';
import { AccountsController } from './accounts/accounts.controller.js';
import { AssessmentService } from './assessment/assessment.service.js';
import { IdentityService } from './auth/identity.service.js';
import { WorkosAuthGuard } from './auth/workos-auth.guard.js';
import { WorkosAuthService } from './auth/workos-auth.service.js';
import { CredentialsService } from './credentials/credentials.service.js';
import { HealthController } from './health/health.controller.js';
import { MeController } from './me/me.controller.js';
import { MetaOAuthController } from './oauth/meta-oauth.controller.js';
import { MetaOAuthService } from './oauth/meta-oauth.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  controllers: [HealthController, MeController, MetaOAuthController, AccountsController],
  providers: [
    PrismaService,
    WorkosAuthService,
    IdentityService,
    WorkosAuthGuard,
    CredentialsService,
    MetaOAuthService,
    AssessmentService,
  ],
})
export class AppModule {}
