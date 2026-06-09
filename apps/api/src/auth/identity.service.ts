import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { WorkosPrincipal } from './workos-auth.service.js';

/**
 * Maps a verified WorkOS principal to our tenant, provisioning Organization /
 * User / Membership on first sign-in (docs/design/AUTH.md). Organization and User
 * are not RLS-scoped (Organization is the tenant root, User is global), so they
 * use the plain client; Membership IS tenant-scoped, so it's created under the
 * org's RLS context via withOrg.
 */
@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOrgId(principal: WorkosPrincipal): Promise<string> {
    const db = this.prisma.client;

    const org = await db.organization.upsert({
      where: { workosOrgId: principal.workosOrgId },
      create: { name: principal.workosOrgId, workosOrgId: principal.workosOrgId },
      update: {},
    });

    // Link by WorkOS id, falling back to a pre-existing user with the same email
    // (e.g. a seeded account) before creating a fresh one.
    let user = await db.user.findUnique({ where: { workosUserId: principal.workosUserId } });
    if (!user && principal.email) {
      const byEmail = await db.user.findUnique({ where: { email: principal.email } });
      if (byEmail) {
        user = await db.user.update({ where: { id: byEmail.id }, data: { workosUserId: principal.workosUserId } });
      }
    }
    user ??= await db.user.create({
      data: {
        workosUserId: principal.workosUserId,
        email: principal.email ?? `${principal.workosUserId}@users.workos.local`,
        name: principal.name,
      },
    });

    const userId = user.id;
    await this.prisma.withOrg(org.id, (tx) =>
      tx.membership.upsert({
        where: { userId_orgId: { userId, orgId: org.id } },
        create: { userId, orgId: org.id },
        update: {},
      }),
    );

    return org.id;
  }
}
