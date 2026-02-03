# Phase B — Stripe Workflow Spec

## Decision

- Keep **Stripe Checkout** for payments (lower complexity, PCI handled by Stripe).
- Strengthen idempotency, reconciliation, and audit logging.

## Canonical Flow (Proposed)

1) **OrderIntent creation (pre-Stripe)**
- Create a new internal record (OrderIntent) with:
  - `status = CREATED`
  - snapshot of pricing inputs
  - user + meal + rotation
- Use `orderIntentId` as the idempotency key for Stripe session creation.

2) **Checkout Session creation (server-side only)**
- Compute prices on the server from canonical meal data.
- Build line items from verified totals.
- Include `orderIntentId` and other identifiers in `metadata`.
- Use Stripe idempotency key on `checkout.sessions.create`.

3) **Webhook processing (authoritative)**
- Verify signature using `STRIPE_WEBHOOK_SECRET`.
- Handle at minimum:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
- For success events:
  - Load session + line items (if needed).
  - Confirm totals match internal computation.
  - Create order if not already created.
  - Mark OrderIntent as `PAID`.

4) **Order creation (CMS)**
- Use unique constraints on `stripeSessionId` and `stripePaymentIntentId`.
- Separate payment status from fulfillment status.
- Persist Stripe identifiers for later reconciliation.

5) **Reconciliation job**
- Periodically list Stripe events or sessions for last 72 hours.
- For each paid session, ensure OrderIntent + Order exist.
- Log results; retry failures; mark unresolved for manual review.

## Idempotency Strategy

- Stripe API idempotency keys for POST requests (Checkout Session creation).
- CMS idempotency by unique constraints on Stripe IDs.
- Webhook dedupe via durable storage (DB table) rather than in-memory.

## Security Requirements

- All totals derived on server; ignore client price fields.
- Verify webhook signature and reject unsigned requests.
- Use strict metadata validation and size limits.
- Prevent order creation on unpaid sessions.

## Observability and Audit

- Persist Stripe event metadata in a `payment_events` table.
- Record raw event id, type, created time, and linked OrderIntent/Order.
- Add structured logging for payment lifecycle.

## Web UX Guarantees

- Success page can poll for order status but **webhook remains authoritative**.
- Provide friendly retry UX with session id.

## Data Model Changes (Phase C)

- Introduce OrderIntent (or PaymentAttempt) table.
- Split `Order.status` into:
  - `paymentStatus` (pending/paid/failed/refunded)
  - `fulfillmentStatus` (new/preparing/ready/delivered/cancelled)
- Add audit fields for Stripe charge/refund IDs.

## Open Decisions

- Whether to store line item snapshots in OrderIntent or Order.
- Whether to compute taxes via Stripe Tax or internal rules.
- Whether to support alternative payment methods beyond cards.

## References

- Stripe webhook signature verification and `checkout.session` event handling.
  https://docs.stripe.com/webhooks
  https://docs.stripe.com/payments/checkout
- Stripe idempotency keys for POST requests.
  https://docs.stripe.com/api/idempotent_requests
