# FWE Monorepo

Turborepo workspace for the FWE storefront and CMS apps.

## Apps

- `apps/web`: customer storefront
- `apps/cms`: admin/CMS and API

## Commands

```sh
bun install
bun run dev
bun run build
bun run lint
bun run check-types
```

Local database (Docker):

```sh
bun run db:up
bun run db:migrate
```

Run a single app:

```sh
bun run dev --filter=web
bun run dev --filter=cms
```

## Packages

- `packages/db`: Prisma schema, migrations, and client
- `packages/types`: shared API response types
- `packages/validators`: shared Zod schemas
- `packages/utils`: shared utilities (price calculations, etc.)

## Architecture

- Auth and all APIs remain centralized in `apps/cms`.
- Prisma lives in `packages/db` and is imported by the CMS.
- `apps/web` calls CMS endpoints with `x-internal-api-key` (no direct DB access).

### Commerce Features

| Feature | Status | Notes |
|---|---|---|
| Weekly rotation scheduling | Shipped | Wed-Tue ordering windows, rotation periods |
| Cart checkout with Stripe | Shipped | Immutable checkout snapshots, idempotent order creation |
| Meal plan credits | Shipped | Ledger-backed credit system with weekly caps |
| Hands OFF auto-assignment | Shipped | Flavor-profile-scored meal selection, credit redemption |
| Guest checkout | Shipped | Ghost-user rules, admin-reviewed merge |
| Onboarding + flavor profiles | Shipped | HANDS_ON / HANDS_OFF involvement levels |
| Referral codes | Admin CRUD | Customer-facing entry deferred |
| Prep sheets + reports | Shipped | Chef-assigned quantities, variation breakdowns |

### API Endpoints (CMS)

Internal endpoints (require `x-internal-api-key`):
- `POST /api/assignments` - Trigger Hands OFF meal assignments
- `GET/POST /api/referrals` - List/create referral codes
- `GET/PATCH /api/referrals/[id]` - Get details/toggle status
- `GET/POST /api/orders` - Order management
- `POST /api/checkout` - Stripe checkout session creation
- `GET /api/rotation/active` - Current rotation with meals

## Testing

```sh
bun run test              # run all tests
bunx vitest run <path>    # run specific test file
```

## Rollout Verification

Every branch merge should pass:

```sh
bunx vitest run           # all tests green
bun run check-types       # no type errors
bun run lint              # no lint errors (warnings OK)
bun run build             # successful build
```
