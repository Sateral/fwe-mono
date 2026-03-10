# Business-Safe Rollout Design

Status: approved for planning
Last updated: 2026-03-10

## Goal

Implement the next FWE product phase as a business-safe staged rollout while
explicitly allowing major rewrites when they produce a more stable, secure,
scalable, and maintainable system.

## Current Assessment

### What is already good

- The monorepo split is sound: `apps/cms` is already the data and auth source of
  truth, while `apps/web` behaves as a storefront client.
- The repo has a healthy shared-package direction with `packages/db`,
  `packages/validators`, `packages/types`, and `packages/utils`.
- The current Stripe flow already shows awareness of idempotency and recovery via
  `PaymentEvent`, `FailedOrder`, `OrderIntent`, and webhook processing.
- The product architecture doc in `docs/fwe-product-architecture-plan.md`
  captures the future business model well enough to plan from it.

### What is currently weak or risky

- The live commerce model is still built around one meal per checkout and one
  `OrderIntent` per Stripe session.
- Rotation logic is still anchored to the old Wednesday-Tuesday rules and is not
  aligned with the target Thursday 3pm cutoff.
- The schema and services still treat signature meals as a first-class concept,
  even though the target business removes them.
- Money is still modeled with `Float`, which is not ideal for a payment-heavy,
  credit-aware system.
- There is no automated test baseline yet, which makes payment and date rewrites
  unnecessarily risky.
- Guest checkout, ghost-user merge rules, meal-plan balances, and onboarding
  profile persistence are still design concepts rather than system primitives.

## Delivery Principles

### 1. Business safety beats compatibility theater

We will preserve revenue flow and operational continuity, but we will not keep
fragile abstractions alive just because they already exist. If a subsystem is a
poor foundation for the target business model, it should be replaced instead of
being stretched further.

### 2. Rewrites are allowed when justified

Large changes are explicitly encouraged when they materially improve one or more
of the following:

- payment correctness
- security posture
- operational reliability
- scalability under more products, orders, and admin workflows
- maintainability for future phases

Examples of justified rewrite candidates in this repo:

- replacing the `OrderIntent`-centric checkout path with a cart/finalization
  pipeline
- rewriting rotation date math into a dedicated scheduling module
- restructuring order creation so Stripe settlement and credit settlement share
  one canonical order-finalization service
- moving from float-based price math toward a Decimal-backed money model

### 3. Stage the cutover even when the implementation is a rewrite

When a rewrite is approved, delivery still follows these rules:

- add schema before relying on it in production behavior
- keep old read/write paths until the new path is verified
- cut over one high-risk domain at a time
- verify with tests and command evidence before claiming a phase is complete

### 4. CMS remains the authority

All critical business logic stays in `apps/cms`:

- ordering windows and delivery-week resolution
- pricing validation
- cart settlement
- guest identity handling
- meal-plan balances and ledgers
- Stripe webhook finalization

The web app should remain a UI/client boundary and not own business state.

## Target Architecture

### Commerce core

The current `OrderIntent -> Stripe session -> one Order` path should be replaced
by a cart-centered architecture:

- `Cart`
- `CartItem`
- a canonical settlement method enum
- one order-finalization service that can create one or many `Order` records
- Stripe-specific orchestration kept separate from core order creation

`OrderIntent` should either be retired or reduced to a compatibility adapter if
the cart model fully supersedes it.

### Scheduling core

Rotation logic should move into a dedicated scheduling layer with explicit,
testable functions for:

- ordering window resolution
- delivery week resolution
- prep week resolution
- Thursday 3:00pm Toronto cutoff handling
- `RotationPeriod` biweekly grouping

`WeeklyRotation` should remain the operational delivery-week record, but the
period-level menu planning should live on `RotationPeriod`.

### Identity core

Guest checkout should not create orphaned orders. The system should keep
`Order.userId` required and use guest semantics on `User` instead.

The target identity model includes:

- guest users
- merge lineage
- order-time customer snapshots
- conservative merge rules by default

### Meal-plan core

Meal plans should be modeled as credit bundles with ledger-backed balance and
window-based usage enforcement, not as subscriptions.

The target model includes:

- `MealPlan`
- `MealPlanWindowUsage`
- `MealPlanCreditLedger`

### Profile core

The onboarding questionnaire should persist into a structured profile model that
the chef can edit in the CMS. This should be its own durable data model, not a
temporary frontend-only flow.

## Rollout Strategy

### Phase 0 - Safety net and baseline

- Add test infrastructure.
- Lock down current payment/idempotency behavior with tests.
- Record the existing lint/typecheck baseline so new failures are visible.

### Phase 1 - Foundational schema introduction

- Add new schema elements for carts, rotation periods, guest users, meal plans,
  flavor profiles, and referrals.
- Prefer additive migrations and backfills over destructive changes.
- Introduce new code paths without routing production traffic through them yet.

### Phase 2 - Rotation rewrite

- Rewrite ordering-window logic to Thursday 3pm Toronto boundaries.
- Introduce `RotationPeriod` planning.
- Keep weekly operational reporting intact.

### Phase 3 - Menu model cleanup

- Remove signature-meal assumptions from services and the storefront.
- Make rotating meals the default and only orderable meal class.

### Phase 4 - Checkout rewrite

- Replace the single-item checkout path with cart-based Stripe settlement.
- Keep Stripe webhook finalization authoritative.
- Create one `Order` per cart item from a shared order-finalization service.

### Phase 5 - Guest checkout

- Allow guest carts and checkout.
- Create ghost users.
- Add merge-safe follow-up rules.

### Phase 6 - Onboarding and profile persistence

- Persist the questionnaire.
- Expose the profile to users and CMS staff.
- Support chef overrides.

### Phase 7 - Meal-plan purchase and redemption

- Add plan purchase.
- Enforce weekly caps and balance ledger rules.
- Support fully credit-backed cart checkout without Stripe.

### Phase 8 - Hands OFF workflow

- Build chef assignment tooling.
- Deduct credits on assignment commit.
- Surface assigned meals to customers.

### Phase 9 - Referral activation and follow-up automation

- Keep the first pass schema-first.
- Defer customer-facing referral UX until the commerce core is stable.

## Rewrite Policy

Use a rewrite instead of an incremental patch when all of the following are true:

1. The current abstraction does not match the target business model.
2. A compatibility layer would be more complex than a replacement.
3. The rewrite can be isolated behind a staged cutover.
4. The rewrite reduces long-term risk in payments, scheduling, or identity.

For this project, the default stance should be:

- conservative about business risk
- aggressive about removing weak foundations

## Git and Release Strategy

- Keep `main` releasable.
- Use one branch per phase or sub-phase.
- Use worktrees for parallel planning and implementation tracks.
- Keep commits small and verification-backed.
- Separate schema introduction commits from behavior-switch commits whenever
  possible.

Recommended branch sequence:

- `phase/0-test-baseline`
- `phase/1-schema-foundations`
- `phase/2-rotation-rewrite`
- `phase/3-menu-cleanup`
- `phase/4-cart-checkout`
- `phase/5-guest-checkout`
- `phase/6-onboarding-profile`
- `phase/7-meal-plan-redemption`
- `phase/8-hands-off-workflow`

## Default Product Decisions For Safe Execution

If product answers are still pending when implementation begins, use these safe
defaults until the client confirms otherwise:

- breakfast affects pricing only in v1, not credit count
- meal-plan credits do not expire in v1
- over-cap carts are blocked instead of hybridized
- ghost-user merge is automatic only after exact normalized email match on a
  signed-in account; everything else requires admin review
- Hands OFF assignment happens after ordering cutoff and before prep execution

## Success Criteria

- The site can support rotating-only menus, multi-item carts, guest checkout,
  onboarding persistence, and meal-plan redemption.
- Stripe settlement and credit settlement both use auditable, idempotent server
  workflows.
- Rotation math matches the business rules exactly at timezone boundaries.
- The CMS remains the operational source of truth.
- The architecture is simpler after the rollout than before it.
