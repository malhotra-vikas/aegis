import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness + database reachability. No tenant scope (excluded from the tenant
  // middleware), so it works before any org context exists.
  @Get()
  async check(): Promise<{ status: string }> {
    await this.prisma.client.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
