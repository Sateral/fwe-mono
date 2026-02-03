# Phase C — Data Model Safety

## Summary

This phase introduces payment-safe structures and **removes** `Order.status` in favor
of explicit `paymentStatus` and `fulfillmentStatus`. Backward compatibility is not
maintained (DB reset is expected).

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

- `Order.status` removed.
- CMS and web now use `paymentStatus` and `fulfillmentStatus`.

## Migration

- Schema updated in `packages/db/prisma/schema.prisma`.
- Run migration in your dev database:

```sh
bun run db:migrate
```

## Notes

- Next phase will wire webhook processing to `PaymentEvent` and `OrderIntent`.
