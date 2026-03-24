# FWE Product Architecture Plan

Status: working planning document
Last updated: 2026-03-10

## Purpose

This document is the source of truth for the next round of FWE product and
architecture work. It captures the current monorepo architecture, the client's
latest business rules, the confirmed customer flows, the meal-credit model, and
the recommended implementation direction so future agents can reason about the
system without reconstructing the context from chat history.

Companion artifacts:

- `docs/FWE Customer Process Flow v2.png`
- `docs/phase-a-audit.md`
- `docs/phase-b-stripe-workflow.md`
- `docs/phase-c-data-model.md`

## Definitions

- Ordering window: the time span during which customers place orders for the
  following delivery week.
- Delivery week: the week in which meals are prepared and fulfilled.
- Rotation period: a biweekly menu block; the same rotating meal set is used for
  two consecutive delivery weeks.
- Ghost user: a `User` row created for a guest checkout so orders remain linked
  to a user record and can later be merged into a full account.
- Meal plan: a prepaid bundle of meal credits, modeled as credits with a weekly
  redemption cap rather than as a recurring subscription.
- Hands ON: customer picks their own meals.
- Hands OFF: chef assigns meals using the customer's saved profile.

## Current Architecture Snapshot

### Repo structure

- `apps/web`: customer storefront, ordering flow, auth proxy, Stripe-facing UI.
- `apps/cms`: admin dashboard, API layer, Better Auth, business services.
- `packages/db`: Prisma schema and generated client.
- `packages/validators`: shared Zod schemas.
- `packages/types`: shared response and entity types.
- `packages/utils`: formatting and price helpers.

### Current system behavior

- The CMS is the source of truth for auth, meals, rotations, and orders.
- The web app never talks to the database directly; it calls CMS REST endpoints
  through `apps/web/lib/cms-api.ts` with `x-internal-api-key`.
- Checkout is currently single-meal only:
  - `apps/cms/app/api/checkout/route.ts` creates one `OrderIntent`
  - Stripe Checkout runs with one line item
  - `apps/cms/lib/stripe-service.ts` converts the paid session into one `Order`
- Rotations are currently weekly and independent:
  - `packages/db/prisma/schema.prisma` uses `WeeklyRotation`
  - `apps/cms/lib/services/weekly-rotation.service.ts` assumes Wednesday
    12:00am through Tuesday 11:59pm in Toronto time
- Meals currently support `SIGNATURE` and `ROTATING` via `MealType`, and the web
  ordering UI expects both.

### Current hotspots that will change

- `packages/db/prisma/schema.prisma`
- `apps/cms/lib/services/weekly-rotation.service.ts`
- `apps/cms/app/api/checkout/route.ts`
- `apps/cms/lib/stripe-service.ts`
- `apps/cms/app/api/webhooks/stripe/route.ts`
- `apps/web/components/order/order-page-client.tsx`
- `apps/web/lib/cms-api.ts`

### Known current gaps

- Rotation date math still uses the old Wednesday to Tuesday window.
- `WeeklyRotation` comments in Prisma are stale and do not match the actual
  service logic.
- `getAvailableMeals()` still assumes signature meals exist.
- `isOrderingOpen` behavior is not final and the current flow is not safe for a
  credit-based plan checkout.
- Checkout is not cart-based, so it cannot support multi-meal orders in one
  Stripe session.

## Confirmed Product Rules (Target State)

### Ordering model

- Ordering window must change to Thursday 3:00pm through the following Thursday
  2:59:59pm in Toronto time.
- Orders placed during ordering window N are grouped for delivery in week N+1.
- The chef is always preparing the prior delivery week while customers are
  ordering for the next one.

### Menu model

- Signature meals are being removed.
- The chef will always have rotating meals available.
- The same meal set should remain active for two consecutive delivery weeks.
- A new `RotationPeriod` concept should group the two weekly records that share
  the same menu.

### Checkout model

- Customers can order multiple meals in one checkout.
- Stripe should use one session with multiple line items for pay-as-you-go
  orders.
- Guest checkout is supported.
- Guest checkout should create a ghost `User` record instead of leaving orders
  unattached.

### Pickup and fulfillment

- Pickup location is hardcoded for now as Xtreme Couture.
- Delivery and pickup continue to exist as fulfillment options.

### Onboarding and profile model

- The onboarding questionnaire builds the customer profile.
- The chef can override flavor/profile details from the CMS.
- Post-signup flow should redirect users to `/onboarding` with skip options at
  every step.

### Referral model

- Referral support is required at the schema level now.
- UI and customer-facing referral workflows are deferred.

## Customer Flows

## Entry points

Landing page entry points:

1. Guest order
2. Create account / onboarding
3. Quick onboarding questionnaire

## Guest checkout path

Guest checkout intentionally avoids the full profile flow.

1. Browse and select meals.
2. Build a cart.
3. Enter minimal contact info: name, email, phone.
4. Enter delivery or pickup details.
5. Pay through Stripe.
6. Receive confirmation.
7. Optionally convert to a full account later by merging the ghost user.

Implications:

- Guest users still need a persistent `User` row.
- Orders, carts, and future merges should all point at that ghost user.
- Guest checkout is pay-as-you-go only; there is no concept of anonymous meal
  credits.

## Onboarding questionnaire

The questionnaire has seven screens plus a final confirmation screen.

| Screen                             | Input type               | Values                                                                                                                                                                                  | Saved to profile | Drives                                   |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| Main goal                          | Multi-select             | Fat loss / weight cut; Muscle gain / performance; I have no time to cook; I want structure / discipline; Budget friendly / convenience; Fresh quality ingredients; I want to eat better | Yes              | Recommendation logic, chef context       |
| Routine                            | Single select            | Week-Day Warrior (5 per week); ALL-IN Operator (7 per week)                                                                                                                             | Yes              | `daysPerWeek` for plan sizing            |
| Daily fuel                         | Single select            | 87 Octane = 1 meal/day; 89 Octane = 2 meals/day; 91 Octane = 3 meals/day                                                                                                                | Yes              | `mealsPerDay`, weekly credit cap         |
| Breakfast add-on                   | Single select            | Yes / No                                                                                                                                                                                | Yes              | Pricing and possible extra daily credits |
| Dietary restrictions               | Multi-select + free text | Gluten-free; Dairy-free; Nut allergy; Shellfish; Halal; Kosher; Vegetarian; No pork; No red meat; No seafood; custom notes                                                              | Yes              | Exclusions and auto-assignment rules     |
| Flavor profile and fuel preference | Multi-select + free text | Spicy; Savory; Mediterranean; Asian; Classic Comfort; High protein; Low carb; No veg; Extra carb and veg; custom notes                                                                  | Yes              | Sorting and chef assignment inputs       |
| Involvement                        | Single select            | Hands ON; Hands OFF                                                                                                                                                                     | Yes              | Meal selection mode                      |
| Final review                       | Free text + confirm      | Last questions and confirmation                                                                                                                                                         | Yes              | Profile completion                       |

### Hands ON branch

- User completes onboarding.
- User is directed to meal selection.
- User chooses meals for the current ordering window.
- User checks out either with credits or via Stripe, depending on account state.

### Hands OFF branch

- User completes onboarding.
- User does not pick meals manually.
- Chef assigns meals based on goals, restrictions, preferences, and the active
  rotation.
- User still needs a visible confirmation state in the account so they can see
  what was selected for that delivery week.

## Shared checkout flow

All authenticated paths converge on the same order review structure.

1. Confirm meals, quantities, modifications, package, and pricing.
2. Confirm personal info: name, email, phone.
3. Confirm delivery details: Xtreme pickup or delivery.
4. Submit order.
5. Receive confirmation.

Two settlement paths are required:

- Pay-as-you-go path: Stripe Checkout session with multiple line items.
- Credit redemption path: internal credit validation and order creation without
  Stripe if the cart is fully covered by meal-plan credits.

Recommended v1 constraint:

- Do not support hybrid payment in the same cart yet. A cart is either fully
  paid by Stripe or fully redeemed with credits.

## Post-order follow-up

Planned follow-up events:

- Confirmation email
- Review request
- Menu switch notification
- New content or new option notification
- Reminder to lock in the next week's order
- Weeks remaining / next delivery date summary
- Re-engagement questionnaire

These can be documented now and implemented in a later phase.

## Meal Plans and Credits

## Product framing

The 4-week plan is best modeled as a prepaid credit bundle, not as a recurring
subscription.

Why this matters:

- Credits roll over if a customer skips a week.
- Redemption is capped per ordering window.
- The customer is buying four weeks worth of meals up front, but actual usage
  can spill beyond four calendar weeks if credits remain.
- This behaves more like a stored-value plan with weekly guardrails than like a
  true subscription.

## Base credit formula

Inputs gathered during onboarding:

- `daysPerWeek`: 5 or 7
- `mealsPerDay`: 1, 2, or 3
- `breakfastIncluded`: yes or no

Confirmed mapping for daily fuel:

- 87 Octane = 1 meal/day
- 89 Octane = 2 meals/day
- 91 Octane = 3 meals/day

Base formula:

```text
weeklyCreditCap = daysPerWeek * mealsPerDay
totalCreditsPurchased = weeklyCreditCap * 4
```

Examples without breakfast adjustments:

| Routine          | Daily fuel | Weekly cap | Total 4-week credits |
| ---------------- | ---------- | ---------- | -------------------- |
| Week-Day Warrior | 87 Octane  | 5          | 20                   |
| Week-Day Warrior | 89 Octane  | 10         | 40                   |
| Week-Day Warrior | 91 Octane  | 15         | 60                   |
| ALL-IN Operator  | 87 Octane  | 7          | 28                   |
| ALL-IN Operator  | 89 Octane  | 14         | 56                   |
| ALL-IN Operator  | 91 Octane  | 21         | 84                   |

## Weekly redemption rule

- A customer cannot redeem more than `weeklyCreditCap` in a single ordering
  window, even if their total remaining balance is higher because of rollover.
- Unused credits remain in the plan balance.
- Credits are decremented when an order is submitted or when a chef assignment is
  committed on behalf of a Hands OFF customer.

## Rollover behavior

- If the customer skips a week, the unused credits remain available.
- The weekly cap still applies in future windows.
- This means a user can carry unused credits forward, but cannot spend the full
  rolled-over balance all at once unless product rules later change.

Example:

```text
Plan: 7 credits/week, 28 total credits
Week 1: use 0 -> remaining 28
Week 2: use 7 -> remaining 21
Week 3: use 4 -> remaining 17
Week 4: use 7 -> remaining 10
Week 5+: remaining 10 can still be used, max 7 in any single window
```

## Breakfast add-on

The questionnaire includes a breakfast add-on, but the exact credit accounting is
not fully locked yet.

Working assumption for planning:

- Breakfast affects plan pricing.
- Breakfast may increase the effective daily meal count by one per selected day.
- Final pricing and credit math for breakfast should be confirmed before schema
  and checkout implementation are finalized.

## Credit redemption semantics

Recommended v1 behavior:

- One meal item consumes one credit unless a future package rule says otherwise.
- A credit-backed cart bypasses Stripe and creates orders internally.
- If the cart exceeds the customer's weekly cap or remaining balance, block the
  credit checkout and ask the user to adjust the cart or use a separate
  pay-as-you-go flow.

## Current Data Model and Service Baseline

### Current key Prisma models

| Model            | Current responsibility                                            | Limitation                                        |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `Meal`           | Menu entity with tags, modifiers, substitutions, `mealType`       | Still assumes signature vs rotating split         |
| `WeeklyRotation` | One weekly menu record with `weekStart`, `weekEnd`, `orderCutoff` | No biweekly grouping                              |
| `OrderIntent`    | Pre-payment single-meal checkout record                           | Cannot support cart checkout or credit settlement |
| `Order`          | One paid order for one meal and one rotation                      | Assumes a payment-first Stripe flow               |
| `PaymentEvent`   | Durable Stripe event log                                          | Only covers Stripe-backed orders                  |
| `User`           | Auth, profile, address                                            | No ghost-user lifecycle or meal-plan state        |

### Current important services

| File                                               | Current responsibility                           |
| -------------------------------------------------- | ------------------------------------------------ |
| `apps/cms/lib/services/weekly-rotation.service.ts` | Ordering window math and available meal lookup   |
| `apps/cms/app/api/checkout/route.ts`               | Creates one `OrderIntent` and one Stripe session |
| `apps/cms/lib/stripe-service.ts`                   | Converts a paid Stripe session into one `Order`  |
| `apps/cms/app/api/webhooks/stripe/route.ts`        | Stripe webhook orchestration                     |
| `apps/cms/lib/services/order.service.ts`           | Order creation and admin querying                |
| `apps/web/lib/cms-api.ts`                          | Web app client for CMS endpoints                 |

## Target Technical Architecture

## Rotation architecture

Recommended target model:

- Keep `WeeklyRotation` as the operational delivery-week record.
- Add `RotationPeriod` to represent the two-week shared menu block.
- Move the meal relationship from weekly-only thinking to period-level planning.
- Link each `WeeklyRotation` to one `RotationPeriod`.

Recommended responsibilities:

| Entity           | Responsibility                                                |
| ---------------- | ------------------------------------------------------------- |
| `RotationPeriod` | Biweekly menu definition, publish state, planned meals        |
| `WeeklyRotation` | Concrete delivery week dates, order cutoff, reporting linkage |
| `Order`          | Links to the actual delivery week                             |

This lets the chef plan one menu once and use it across two delivery weeks while
still keeping weekly reporting and prep views intact.

## Cart and checkout architecture

Replace single-meal checkout with a cart-centered flow.

Recommended new models:

- `Cart`
- `CartItem`

Recommended behavior:

1. User adds meals to a cart for the current ordering window.
2. Cart captures the intended settlement method:
   - `STRIPE`
   - `MEAL_PLAN_CREDITS`
3. `CartItem` stores meal snapshot, quantity, customizations, and unit price.
4. On checkout:
   - Stripe carts create one Checkout Session with many line items.
   - Credit carts validate balance and weekly cap, reserve or deduct credits, and
     create orders without Stripe.
5. After successful completion, create one `Order` per `CartItem`.

Why this is preferred:

- It supports multi-meal carts cleanly.
- It supports both Stripe and credit settlement.
- It avoids overloading `OrderIntent` with logic it was not designed for.

## Guest user architecture

Recommended direction:

- Keep `Order.userId` required.
- Add ghost-user semantics to `User` instead of making orders nullable.

Suggested `User` additions:

- `isGuest`
- `guestMergedIntoUserId` or equivalent merge pointer
- merge audit timestamps if needed

Optional but recommended order snapshots:

- customer name at order time
- customer email at order time
- customer phone at order time
- delivery address snapshot at order time

This preserves order history even if the user profile changes later.

## Meal-plan architecture

Recommended data model:

- `MealPlan`
- `MealPlanWindowUsage`
- `MealPlanCreditLedger`

This is preferred over a rigid `MealPlanWeek`-only design because rollover means
the system needs both:

- a total balance ledger
- per-window usage enforcement

Suggested responsibilities:

| Model                  | Responsibility                                                          |
| ---------------------- | ----------------------------------------------------------------------- |
| `MealPlan`             | Plan purchase, configuration, balance, weekly cap, lifecycle            |
| `MealPlanWindowUsage`  | How many credits were used in a specific ordering window                |
| `MealPlanCreditLedger` | Auditable transactions such as purchase, redemption, refund, adjustment |

Suggested `MealPlan` fields:

- `userId`
- `status`
- `daysPerWeek`
- `mealsPerDay`
- `breakfastIncluded`
- `weeklyCreditCap`
- `totalCreditsPurchased`
- `remainingCredits`
- `purchasedAt`
- `activatedAt`
- `expiresAt` if product later wants expiration
- Stripe identifiers for the purchase event

Suggested ledger event types:

- `PURCHASE`
- `REDEMPTION`
- `REFUND`
- `ADJUSTMENT`
- `REVERSAL`

## Flavor profile architecture

Recommended new model: `FlavorProfile`

It should hold structured data from onboarding:

- goals
- routine
- meals per day
- breakfast included
- dietary restrictions
- custom restriction notes
- flavor preferences
- macro preferences
- involvement mode
- final notes

Important requirement:

- Chef must be able to override or update this data from the CMS.

## Referral architecture

Schema-only for now:

- `ReferralCode`
- `ReferralUse`

Suggested scope for this pass:

- code ownership
- active flag
- percentage or payout basis
- usage linkage to cart or order
- payout status

UI and checkout entry can be deferred.

## API and Service Direction

### Existing API areas that remain core

- `GET /api/rotation`
- `GET /api/rotation/active`
- `POST /api/checkout`
- `POST /api/webhooks/stripe`
- `GET /api/orders`
- `PATCH /api/orders/:id`
- `PATCH /api/users/:id`

### New or revised API areas

| Area                                        | Purpose                                 |
| ------------------------------------------- | --------------------------------------- |
| `/api/carts`                                | Create and update carts                 |
| `/api/carts/:id/checkout`                   | Finalize Stripe or credit-backed cart   |
| `/api/rotation-periods`                     | Manage biweekly periods in the CMS      |
| `/api/meal-plans`                           | Purchase plans and read balances        |
| `/api/meal-plans/:id/usage`                 | Window usage and ledger views           |
| `/api/onboarding` or user profile endpoints | Save questionnaire state                |
| `/api/referrals`                            | Admin management only in the first pass |

### Service-level recommendations

- Keep pricing validation server-side.
- Move rotation-period logic into services rather than route handlers.
- Keep Stripe webhook handling authoritative for Stripe-funded carts.
- Add a separate internal order-finalization path for credit-funded carts.
- Keep the CMS as the single source of truth for meal-plan balances and ledger
  writes.

## Implementation Phases

## Phase 1 - Product constants and schema design

Goal:

- Lock the target entities, enums, and naming before writing migrations.

Outputs:

- Finalized schema shape for rotations, carts, meal plans, flavor profiles, and
  referrals.
- Removal plan for `SIGNATURE` meal assumptions.

## Phase 2 - Prisma migration

Goal:

- Introduce the new tables and fields safely.

Likely changes:

- Add `RotationPeriod`
- Add `Cart` and `CartItem`
- Add meal-plan tables
- Add `FlavorProfile`
- Add referral tables
- Add ghost-user fields to `User`
- Remove or deprecate signature-meal assumptions

## Phase 3 - Rotation service rewrite

Goal:

- Move date math to Thursday 3pm boundaries and biweekly period logic.

Main files:

- `apps/cms/lib/services/weekly-rotation.service.ts`
- `apps/cms/app/api/cron/rotation-flip/route.ts`
- CMS rotation dashboard files under `apps/cms/app/dashboard/rotation/`

Acceptance notes:

- Orderable week and prep week are both correct around the Thursday cutoff.
- Rotation planning supports two linked delivery weeks per period.

## Phase 4 - Menu retrieval cleanup

Goal:

- Remove signature-meal assumptions from the web and CMS.

Main files:

- `packages/db/prisma/schema.prisma`
- `apps/cms/lib/services/weekly-rotation.service.ts`
- `apps/web/lib/cms-api.ts`
- `apps/web` menu and order pages

## Phase 5 - Cart-based Stripe checkout

Goal:

- Support multi-item pay-as-you-go checkout.

Main files:

- `packages/validators/src/checkout.schema.ts`
- `packages/types/src/index.ts`
- `apps/cms/app/api/checkout/route.ts`
- `apps/cms/lib/stripe-service.ts`
- `apps/cms/app/api/webhooks/stripe/route.ts`
- `apps/web/components/order/order-page-client.tsx`

Acceptance notes:

- One Stripe session can represent multiple cart items.
- Webhook flow creates one order per cart item.

## Phase 6 - Guest users and account merge

Goal:

- Allow guest orders while preserving future account linking.

Main files:

- `packages/db/prisma/schema.prisma`
- checkout routes
- auth-related merge flow files
- user service logic

Acceptance notes:

- Guest checkout creates ghost users.
- A later sign-up with the same identity can merge history cleanly.

## Phase 7 - Onboarding and flavor profile

Goal:

- Persist the questionnaire and expose it to both the user flow and CMS.

Main files:

- `apps/web/app/onboarding/`
- `packages/validators/src/user.schema.ts`
- `apps/cms/app/api/users/:id`
- CMS user profile views

## Phase 8 - Meal-plan purchase and redemption

Goal:

- Support buying a plan, tracking balances, enforcing weekly caps, and creating
  orders from credits.

Main files:

- meal-plan service files
- cart checkout services
- plan purchase UI
- account summary pages

Acceptance notes:

- Plan purchases create credit balances.
- Credit checkout bypasses Stripe when fully covered.
- Weekly cap enforcement works even when credits roll over.

## Phase 9 - Hands OFF assignment workflow

Goal:

- Give the chef tooling to assign meals for Hands OFF customers.

Main requirements:

- Queue of plan holders needing assignment
- Use profile constraints and current rotation meals
- Deduct credits when assignments are committed
- Surface assigned meals to the customer

## Phase 10 - Referral schema and later automation hooks

Goal:

- Add the data model now so referral support can be layered in later without a
  second schema rethink.

## Recommended Guardrails

- Use Decimal for money if the pricing layer is touched deeply enough to justify
  the migration.
- Keep webhook processing authoritative for Stripe carts.
- Use durable DB-backed idempotency for Stripe events and cart finalization.
- Do not let the web app own balance logic; all credit validation should happen
  in CMS services.
- Snapshot order-time customer and meal data where historical accuracy matters.
- Always use context7 when implementing features, using libraries, and needing docs.

## Open Decisions

These items are not blockers for the planning doc, but they should be resolved
before or during implementation.

1. Breakfast credit math: does breakfast add one additional credit per selected
   day, or is it priced another way?
2. Plan expiration: do unused credits live forever, expire after a grace period,
   or remain valid only while the plan is active?
3. Over-cap behavior: if a customer wants more meals than the weekly cap allows,
   should they be blocked or allowed to start a separate pay-as-you-go cart?
4. Merge rules for ghost users: what exact identity match is sufficient for a
   safe merge - email only, email plus phone, or manual admin review?
5. Hands OFF timing: when exactly does the chef assignment occur relative to the
   ordering cutoff?
6. Referral economics: percentage discount, payout model, and whether referrals
   apply to plan purchases, pay-as-you-go orders, or both.

## Recommended Next Document

After this planning doc, the next useful artifact is a build-oriented
implementation plan that breaks the work into concrete tasks, migrations, and
verification steps.
