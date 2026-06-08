# Aegis OAuth and Credential Security

> The single biggest security liability in the product is the store of customer ad-account access tokens. A breach here exposes other businesses' advertising accounts, which is existential for the brand and fatal at exit diligence. This document specifies how tokens are obtained, scoped, stored, used, and retired. It is written SOC-2-shaped from day one so the exit data room is clean.
>
> **Accuracy contract:** Meta's token model, scopes, and endpoints below were verified against current (2026) documentation during research. Meta deprecates API versions on a roughly two-year rolling schedule and scope requirements shift. Pin an explicit recent API version, and re-verify the scope-to-field mapping and token endpoints against live Meta docs before implementation.

---

## 1. Threat model

What we are defending against, in priority order:

1. **Database compromise** exposing tokens. Mitigation: envelope encryption so the DB alone yields only ciphertext.
2. **Log and error leakage** of tokens. Mitigation: hard redaction, tokens never logged, ever.
3. **Token misuse with a stolen token.** Mitigation: `appsecret_proof` on every call, so a token without the app secret is far less useful.
4. **Over-broad scope** widening blast radius. Mitigation: least privilege, read-only, no write scope.
5. **Insider or service over-access.** Mitigation: only workers decrypt, at point of use, with audit logging.
6. **Key compromise.** Mitigation: KMS-held master key, key versioning and rotation, separation from the data store.
7. **Our own activity triggering enforcement on customer accounts.** Mitigation: rate-limit-aware use, since aggressive automation is itself a ban signal.

---

## 2. Meta token strategy

### 2.1 Token types
- **Short-lived user token:** 1 to 2 hours. Only the transient output of the OAuth handshake.
- **Long-lived user token:** about 60 days, tied to a real person. Breaks if that person leaves or their account status changes.
- **System User token:** belongs to a non-person account in the customer's Business Manager. Can be non-expiring. Does not depend on any individual's account.

### 2.2 The choice, and why it is monitoring-specific
For an unattended monitoring product, **System User tokens are strongly preferred** for the Agency and Scale tiers. The reason is not just convenience. A change in the account management team is itself one of the suspension-risk signals the engine watches. A user token can break at exactly that moment, so the product would go blind precisely when the account is most at risk. A system user token survives staff turnover and keeps monitoring alive through the dangerous transition.

### 2.3 The design tension and the resolution
System user tokens require the customer to create a system user in their Business Manager and assign ad accounts, which is friction that hurts self-serve conversion. So support both paths:

- **Quick path (Free, Solo):** standard OAuth, exchange the short-lived token for a long-lived user token server-side, refresh before the 60-day expiry. Lowest friction, fine for a single operator.
- **Robust path (Agency, Scale):** guided setup of a system user token, framed honestly as "monitoring that does not break when your team changes." This is a feature, not a chore, and it is the more durable and more secure option.

Bias agencies toward the robust path during onboarding.

---

## 3. Least-privilege scopes

Aegis is read-only. It never creates, edits, or pauses anything. Request the minimum that covers the v1 signal catalog:

- `ads_read` for ad account status, `disable_reason`, ad approval/effective_status, and insights.
- `business_management` for Business-Manager-level status, account-quality and linkage signals.
- `pages_read_engagement` / `pages_show_list` for connected-page restriction detection.

**Never request `ads_management`.** We do not write, so a write scope is pure attack surface, a slower and riskier App Review, and a worse data-use story to show users. The exact scope-to-field mapping must be verified against live docs, requesting the smallest set that satisfies the catalog. Note that these scopes require App Review before use with businesses outside our own, which is the critical-path gate flagged elsewhere.

---

## 4. OAuth flow design

1. Authorization Code flow, HTTPS redirect URI only, with a `state` parameter for CSRF protection (and PKCE where the client type supports it).
2. The short-lived-to-long-lived exchange happens server-side. The app secret never touches the client.
3. Every Graph API call includes `appsecret_proof` (HMAC-SHA256 of the access token keyed by the app secret), so a leaked token alone cannot be replayed without the secret.
4. For the system user path, provide a guided in-product walkthrough to create the system user, grant the minimal scopes, assign ad accounts, and paste the generated token over TLS into the encrypted store.

---

## 5. Credential storage (envelope encryption)

Target design:

```
Master key:   held in KMS / platform secret manager, never in the database, never in app memory longer than a call.
Data key:     random 256-bit key per credential record.
Encryption:   AES-256-GCM(dataKey, tokenBundle) -> ciphertext + 96-bit IV + auth tag.
Wrapping:     dataKey encrypted by the master key (KMS), stored as wrappedDataKey.
Stored row:   { ciphertext, iv, authTag, wrappedDataKey, keyVersion, tokenType, scopes, expiresAt, dataAccessExpiresAt }
```

Properties:
- A database compromise yields only ciphertext. Decryption also requires the KMS master key.
- GCM is authenticated, so tampering with ciphertext fails the auth tag.
- `keyVersion` enables rotation: rotate the master key, re-wrap data keys, advance the version, with no plaintext exposure.
- Minimal viable version if KMS-per-record is too heavy at launch: a single master key in the secret manager with AES-256-GCM and per-record IVs. Upgrade to per-record data keys for cleaner rotation. Either way, plaintext tokens are never stored.

**The token bundle stored** contains the access token, token type, granted scopes, expiry timestamps, and granted account ids. Nothing more.

---

## 6. Token lifecycle management

- **Validation:** use the token debug endpoint to confirm App ID, scopes, `expires_at`, and `data_access_expiration` on connect and on a schedule. Detect scope drift early.
- **Refresh:** proactively re-exchange long-lived user tokens before the 60-day boundary. System user tokens set to non-expiring need validity monitoring, not refresh.
- **Failure detection:** error 190 means the token is invalid or expired; 100 and 200 mean missing or denied permission. On any of these, two things happen at once:
  1. Prompt the customer to reconnect.
  2. Treat lost visibility as a risk event. The engine marks the account `assessable = false` and alerts that monitoring is blind, because losing sight of an account is itself a risk, not a silent no-op.
- **Revocation on disconnect:** when a customer disconnects an account or closes their plan, revoke the token via the Graph API where possible and purge the credential record.

---

## 7. Runtime access controls

- Only the worker layer decrypts tokens, at the point of use, in memory, never persisted in decrypted form.
- The web app and API layer never handle raw tokens. They deal in account ids and risk results only.
- Least-privilege service roles: the component that reads the credential store is separate and minimally permissioned.
- **Audit log** on every credential decryption and access: which service, which account, when. Append-only and tamper-evident, because this log is exactly what a security review and an acquirer will inspect.

---

## 8. Network, transport, and abuse safety

- TLS on all transport. Egress restricted to known platform API domains.
- Pin an explicit Graph API version; track the roughly two-year deprecation schedule rather than relying on default fallback.
- **Rate-limit-aware use:** respect the Business Use score via the `X-Business-Use-Case-Usage` header, batch reads, and use exponential backoff with jitter on rate-limit errors. Our own polling must never become the abusive automation pattern that gets our customers' accounts flagged. This is the same discipline as MetaAdsSafe and it is a security and product requirement, not just a performance one.

---

## 9. Compliance posture (SOC-2-shaped from day one)

Not certified at MVP, but built to the shape so certification and diligence are cheap later:
- Encryption at rest (envelope) and in transit (TLS).
- Access logging on credentials, append-only.
- Least-privilege scopes and least-privilege service roles.
- Documented key management and rotation.
- Clear, honest data-use disclosure to customers: what is read, why, how it is stored, that it is read-only.
- Compliance with the platform developer terms governing token storage and data use; legal review of those terms before public launch.

---

## 10. Data handling and retention

- Store only what the product needs: account ids, the status and signal fields, and HealthSnapshots. Tokens encrypted as above.
- Honor deletion requests and offboarding: revoke the token, purge credentials, and remove customer-identifying data on a defined timeline.
- **Outcome-labeled snapshots are retained in de-identified form after offboarding** so the training set survives churn (mechanism in AEGIS_DATA_MODEL.md section 5). The offboarding job extracts the de-identified feature vector and label into the `TrainingSample` store, dropping `rawPayload` and all identifiers, then hard-purges the tenant-scoped rows. The de-identification must be genuinely irreversible to stay within the aggregated/de-identified carve-out of the platform developer terms, so verify it against those terms, not only privacy law.

---

## 11. Implementation checklist

1. OAuth Authorization Code flow with `state`, HTTPS redirect, server-side token exchange.
2. `appsecret_proof` on every Graph API call.
3. Least-privilege scopes only: `ads_read`, `business_management`, page-read scopes. No `ads_management`.
4. Envelope encryption (AES-256-GCM, KMS-wrapped data keys, key versioning).
5. Tokens never logged; redaction filter on all log and error paths.
6. System user token guided onboarding for Agency and Scale.
7. Token validity and scope checks on a schedule via the debug endpoint.
8. Proactive long-lived-token refresh before expiry.
9. Failure handling that both prompts reconnect and raises an `assessable = false` risk alert.
10. Revoke-and-purge on disconnect.
11. Append-only audit log on credential access.
12. Rate-limit-aware connector honoring the Business Use score.

---

## 12. Open decisions

1. KMS provider: cloud KMS versus the Railway secret manager for the master key. Recommendation: a managed KMS if available for proper rotation and audit; secret-manager-with-GCM as the minimal launch fallback.
2. Per-credential versus per-tenant data keys. Recommendation: per-credential for tightest blast-radius isolation; per-tenant if volume makes per-credential rotation costly.
3. How hard to push system user tokens at the Agency tier (optional versus default). Recommendation: default and recommended for Agency and Scale, optional for Solo.

---

## 13. Cross-references

- Architecture and worker layer: AEGIS_SPEC.md
- `assessable = false` and the lost-visibility alert: AEGIS_RISK_ENGINE_SPEC.md
- App Review and Business Verification critical path: AEGIS_SPEC.md and AEGIS_README.md
