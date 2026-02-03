# Phase A Audit Baseline

## Scope

- Stripe workflow in `apps/web`
- CMS order creation and recovery
- Order data model
- CMS orders UX baseline

## Stripe Workflow (Web)

1) Checkout session creation (`apps/web/app/api/checkout/route.ts`)
- Requires authenticated session via `getServerSession`.
- Server-side price calculation using `calculateMealUnitPrice`.
- Creates Stripe Checkout Session with metadata for fulfillment.
- Success/cancel URLs are built from `BETTER_AUTH_URL`.

2) Success page fulfillment (Layer 1) (`apps/web/app/order/success/page.tsx`)
- Calls `fulfillOrder(session_id)` on page load.
- Errors are swallowed to avoid user-facing failures.
- Polls via `ProcessingClient` to refresh until order appears.

3) Webhook handler (Layer 2) (`apps/web/app/api/webhooks/stripe/route.ts`)
- Verifies webhook signature.
- In-memory dedupe via `apps/web/lib/webhook-dedup.ts` (TTL 24h).
- `checkout.session.completed` triggers `fulfillOrder`.
- Refund/dispute events currently log only (no CMS updates).

4) Reconciliation cron (Layer 3) (`apps/web/app/api/cron/sync-stripe/route.ts`)
- Lists Stripe Checkout Sessions from last 24 hours.
- Calls `fulfillOrder` for paid sessions.
- Secured by `CRON_SECRET` header.

## Fulfillment and Order Creation

`apps/web/lib/stripe-service.ts`
- Idempotency check via CMS `orders.getByStripeSession`.
- Retrieves session from Stripe; requires `payment_status === "paid"`.
- Verifies amount using `metadata.totalAmount` vs `session.amount_total`.
- Constructs `CreateOrderInput` and calls CMS `orders.create`.
- On failure, writes to Failed Orders DLQ (`failedOrdersApi.create`).

`apps/cms/lib/services/order.service.ts`
- Idempotency by `stripeSessionId` or `stripePaymentIntentId`.
- Sets order `status = "PAID"` on creation.
- Falls back to current ordering rotation if `rotationId` missing/invalid.
- Second lookup to recover from race conditions.

## Dedup and Recovery

- Webhook dedupe is in-memory (not multi-node safe).
- Failed Orders DLQ exists with retry/resolve/abandon flows.
- CMS exposes failed order endpoints for admin review.

## Data Model Baseline

`packages/db/prisma/schema.prisma`
- `Order` has single `status` enum (PENDING/PAID/PREPARING/DELIVERED/CANCELLED).
- Stripe fields: `stripeSessionId`, `stripePaymentIntentId` (both unique).
- No separate payment vs fulfillment states.

`FailedOrder` model
- Stores `orderData` JSON blob, Stripe IDs, error data, and status.

## CMS Orders UX Baseline

`apps/cms/app/dashboard/orders/*`
- Rotation-based view with context banner (prep/current/past).
- Production summary (meal counts) derived from orders.
- Orders table with quick status updates and detail dialog.
- Customer summary table and per-customer order dialog.
- PDF component exists (`order-pdf.tsx`).

Data sources
- `useOrdersByRotation` and `useProductionSummary` via `order.actions`.
- Production summary computed client-side from orders.

## Observability Baseline

- Console logging across Stripe and CMS services.
- No structured logs or persisted payment event records.

## Baseline Gaps / Risks (Targets for Phase B+)

- Webhook dedupe is in-memory (not multi-node safe).
- Success/cancel URLs use `BETTER_AUTH_URL` instead of a web base URL.
- Single `Order.status` mixes payment and fulfillment state.
- Refund/dispute events do not update CMS records.
- Reconciliation cron only looks back 24 hours.
