# Design: Authentication & sessions

> Short design doc per CLAUDE.md. Scope: how real sign-in works, replacing the
> demo persona cookie. Decided 2026-06-09: **managed B2B auth (WorkOS)**.

## Goal

Replace the `/demo` persona cookie with real authentication, wiring
Organization / User / Membership to actual sign-in, so the NestJS api can resolve
the tenant (`orgId`) for every request and enforce RLS via `PrismaService.withOrg`.

## Why WorkOS

B2B from day one (agencies, Scale tier). WorkOS gives us org-scoped auth, and SSO
on tap when an agency demands it — which matters for the exit story — without us
maintaining password reset, MFA, and SSO ourselves. Cost + a vendor dependency are
the accepted trade-offs.

## Shape

- **Login lives in the web tier.** WorkOS AuthKit handles the hosted sign-in /
  org flows. The web tier holds the WorkOS session (sealed cookie).
- **The api trusts a verified principal, never the cookie blindly.** Each request
  to the api carries a bearer (the WorkOS access token / a JWT). The api verifies
  it (WorkOS JWKS), extracts the WorkOS `organization_id`, maps it to our
  `Organization`, and sets that as the request `orgId` — replacing the
  `x-org-id` header stub in `TenantContextMiddleware`. Everything downstream
  (`withOrg`, RLS) is unchanged.
- **Org mapping.** A WorkOS organization maps 1:1 to our `Organization`
  (store `workosOrgId`). A WorkOS user maps to `User`; `Membership` carries the
  role. First sign-in for a new WorkOS org provisions the `Organization` +
  `Membership` (the same provisioning the demo's lead→customer conversion does,
  minus the sales CRM path).

## Non-goals

- Not replacing `/demo` — it keeps its persona cookie and direct Prisma. Demo-only.
- No self-hosted password store, MFA, or SSO plumbing — WorkOS owns those.
- Not building org/team management UI now — WorkOS AuthKit covers the basics.
- Meta OAuth (connecting an ad account) is **separate** from app login: it's an
  authorization grant for data access, stored as a `Credential`. It is not a
  sign-in mechanism.

## Open / deferred

- Exact token shape (WorkOS access token vs. our own short JWT minted after
  WorkOS login) — decide when wiring the web↔api bearer.
- Local-dev story without hitting WorkOS (a dev bypass that still sets a real
  `orgId`), so tests and local runs don't require the vendor.
