# Local demo: Admin / Sales / Customer

A runnable walkthrough of the two GTM motions (sales-led CRM + self-serve PLG)
and the customer risk experience. The customer dashboard renders the **real**
`@aegis/risk-engine` over seeded Meta snapshots.

> Demo scope, deliberately: web talks to Postgres directly (no NestJS api layer
> yet), auth is a cookie-based persona switcher (no passwords), and Postgres RLS
> is not applied (queries filter by `orgId` in app code). None of these are the
> production design — they keep the demo runnable. See `AEGIS_OAUTH_SECURITY.md`
> and `AEGIS_DATA_MODEL.md` for the real shapes.

## Run it

```bash
docker compose up -d                                          # Postgres + Redis
pnpm install
pnpm --filter @aegis/db migrate                               # apply migrations (first run only)
pnpm --filter @aegis/db seed                                  # load demo data
pnpm --filter @aegis/risk-engine --filter @aegis/db build     # web imports their built dist
pnpm --filter web dev                                         # http://localhost:3000/demo
```

Open http://localhost:3000/demo — you land on the persona switcher. (`/` redirects there.)

## Personas (click to log in, no password)

| Login | Role | Sees |
|-------|------|------|
| `admin@aegis.dev` | Admin | All leads, revenue (active + pipeline MRR, by rep), every customer (sales vs self-serve). Can **add** a lead and **convert** one into a customer. |
| `dana@aegis.dev`, `marco@aegis.dev` | Sales | Their own pipeline and the customers they brought in, with their closed/pipeline MRR. |
| `acme@customer.com`, `ops@northbeam.com`, `hi@lumengrowth.com`, `founder@soloco.com` | Customer | Their own risk dashboard: per-account score/bucket, the ranked risk signals with plain-language explanations and the matched remediation playbook. |

## The flow to demo

1. **Log in as `admin@aegis.dev`.** See the leads table and revenue. Note the
   "Source" column on Customers: `Self-serve` (Solo Founder Co, no lead) vs
   `Sales · <rep>` (converted leads). This is both GTM motions side by side.
2. **Add a lead** with the form, attributing it to a sales rep.
3. **Convert** an open lead. This provisions a real customer tenant: an
   Organization, an owner login (the lead's contact email), a subscription, and
   a connected ad account scored by the live risk engine.
4. **Switch persona → log in as that customer's email.** You're now in their
   risk dashboard, seeing the engine's verdict for the account just provisioned.
5. **Log in as `dana@aegis.dev`** to see the same customers from the rep's view
   with revenue attribution.

The seeded customers show a realistic risk spread: a disabled account (terminal
RED 100), one in pending-review (RED 90), several amber, and clean greens.

## Reset

`pnpm --filter @aegis/db seed` re-wipes and reseeds at any time.
