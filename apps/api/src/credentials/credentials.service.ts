import { sealTokenBundle, type KeyWrapper, type TokenBundle } from '@aegis/shared';
import { Injectable } from '@nestjs/common';
import { buildKeyWrapper } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Persists OAuth credentials as envelope-encrypted rows. The token bundle is
 * sealed (AES-256-GCM) before it ever reaches the database; plaintext is never
 * stored. Writes go through PrismaService.withOrg so they happen under the
 * tenant's RLS scope.
 */
@Injectable()
export class CredentialsService {
  private wrapper?: KeyWrapper;

  constructor(private readonly prisma: PrismaService) {}

  private keyWrapper(): KeyWrapper {
    return (this.wrapper ??= buildKeyWrapper());
  }

  /** Connect (or refresh) one ad account: upsert the ConnectedAccount and store
   *  the sealed credential. Returns the ConnectedAccount id. */
  async storeMetaCredential(
    orgId: string,
    account: { externalId: string; displayName: string | null },
    bundle: TokenBundle,
  ): Promise<string> {
    const sealed = await sealTokenBundle(bundle, this.keyWrapper());
    const expiresAt = bundle.expiresAt ? new Date(bundle.expiresAt) : null;
    const dataAccessExpiresAt = bundle.dataAccessExpiresAt ? new Date(bundle.dataAccessExpiresAt) : null;

    // Prisma's Bytes maps to Uint8Array<ArrayBuffer>; copy out of Node's Buffer.
    const ciphertext = new Uint8Array(sealed.ciphertext);
    const iv = new Uint8Array(sealed.iv);
    const authTag = new Uint8Array(sealed.authTag);
    const wrappedDataKey = new Uint8Array(sealed.wrappedDataKey);

    return this.prisma.withOrg(orgId, async (tx) => {
      const connected = await tx.connectedAccount.upsert({
        where: { orgId_platform_externalId: { orgId, platform: 'META', externalId: account.externalId } },
        create: { orgId, platform: 'META', externalId: account.externalId, displayName: account.displayName },
        update: { displayName: account.displayName },
      });

      await tx.credential.upsert({
        where: { connectedAccountId: connected.id },
        create: {
          orgId,
          connectedAccountId: connected.id,
          tokenType: bundle.tokenType,
          ciphertext,
          iv,
          authTag,
          wrappedDataKey,
          keyVersion: sealed.keyVersion,
          scopes: bundle.scopes,
          expiresAt,
          dataAccessExpiresAt,
        },
        update: {
          tokenType: bundle.tokenType,
          ciphertext,
          iv,
          authTag,
          wrappedDataKey,
          keyVersion: sealed.keyVersion,
          scopes: bundle.scopes,
          expiresAt,
          dataAccessExpiresAt,
          status: 'ACTIVE',
          lastValidatedAt: new Date(),
        },
      });

      return connected.id;
    });
  }
}
