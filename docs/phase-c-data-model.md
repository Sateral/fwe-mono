# Phase C — Data Model Safety

## Summary

This phase introduces payment-safe structures while keeping existing `Order.status`
for backward compatibility. New fields are additive and defaulted.

## Schema Additions

### Order

- `paymentStatus` (PENDING/PAID/FAILED/REFUNDED)
- `fulfillmentStatus` (NEW/PREPARING/READY/DELIVERED/CANCELLED)
- `currency` (default `cad`)
- `paidAt`, `refundedAt`
- `refundAmount`
- Stripe identifiers: `stripeChargeId`, `stripeRefundId`, `stripeBalanceTransactionId`
- Optional `orderIntentId` relation

### OrderIntent (new)

- Pre-payment snapshot of order inputs and pricing.
- Holds Stripe session/payment intent IDs when created.
- One-to-one relation to `Order` (optional until fulfillment).

### PaymentEvent (new)

- Durable log for payment events (Stripe webhook dedupe and audit).
- Stores event id/type, payload JSON, linkage to Order/OrderIntent.

## Compatibility

- Existing `Order.status` remains in use by CMS UI.
- New fields are defaulted to avoid breaking existing rows.

## Migration

- Schema updated in `packages/db/prisma/schema.prisma`.
- Run migration in your dev database:

```sh
bun run db:migrate
```

## Notes

- Next phase will wire webhook processing to `PaymentEvent` and `OrderIntent`.
