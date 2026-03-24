# Business-Safe Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the FWE rotation, checkout, guest, onboarding, and meal-plan systems into a secure CMS-owned commerce platform without breaking active business operations.

**Architecture:** Introduce test coverage and additive schema first, then replace weak foundations behind staged cutovers. Large rewrites are explicitly allowed when they reduce security, correctness, or maintenance risk, but each rewrite must land with a reversible rollout boundary and verification evidence.

**Tech Stack:** Bun, Turborepo, Next.js App Router, TypeScript, Prisma/Postgres, Better Auth, Stripe, Zod, Vitest

---

## Execution Rules

- Required implementation skills during execution: `@superpowers/test-driven-development`, `@superpowers/verification-before-completion`, and `@superpowers/systematic-debugging` whenever a test or verification step fails.
- Keep `main` releasable after every merged task.
- Prefer additive migrations first, destructive cleanup later.
- Do not preserve weak abstractions just to avoid rewriting them.
- If a rewrite is safer than extending the current design, do the rewrite in its
  own branch with tests and cutover checks.

### Task 1: Add the Test Harness

**Files:**
- Create: `vitest.config.ts`
- Create: `test/setup/env.ts`
- Create: `packages/utils/src/price-utils.test.ts`
- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `packages/utils/package.json`
- Modify: `apps/cms/package.json`
- Test: `packages/utils/src/price-utils.test.ts`

**Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";

import { calculateMealUnitPrice } from "./price-utils";

describe("calculateMealUnitPrice", () => {
  it("adds substitutions, modifiers, and protein boost", () => {
    expect(
      calculateMealUnitPrice(
        {
          price: 14,
          modifierGroups: [{ id: "mods", options: [{ id: "avocado", extraPrice: 2 }] }],
          substitutionGroups: [{ id: "subs", options: [{ id: "quinoa", priceAdjustment: 1.5 }] }],
        },
        { mods: ["avocado"] },
        { subs: "quinoa" },
        true,
      ),
    ).toBe(19.5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run packages/utils/src/price-utils.test.ts`
Expected: FAIL because Vitest config and scripts do not exist yet.

**Step 3: Add minimal test infrastructure**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup/env.ts"],
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
  },
});
```

- Add root scripts for `test` and `test:watch`.
- Add a `test` task to `turbo.json`.
- Add local package `test` scripts where needed.

**Step 4: Run the smoke test again**

Run: `bunx vitest run packages/utils/src/price-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vitest.config.ts test/setup/env.ts package.json turbo.json packages/utils/package.json apps/cms/package.json packages/utils/src/price-utils.test.ts
git commit -m "test: add workspace vitest baseline"
```

### Task 2: Lock Current High-Risk Behavior With Tests

**Files:**
- Create: `apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts`
- Create: `apps/cms/lib/services/__tests__/order.service.test.ts`
- Create: `apps/cms/lib/__tests__/stripe-service.test.ts`
- Modify: `apps/cms/package.json`
- Test: `apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts`
- Test: `apps/cms/lib/services/__tests__/order.service.test.ts`
- Test: `apps/cms/lib/__tests__/stripe-service.test.ts`

**Step 1: Write failing baseline tests for date and idempotency behavior**

```ts
it("returns one existing order when the same stripe identifiers are retried", async () => {
  // mock prisma + service calls
  expect(order.id).toBe(existing.id);
});
```

```ts
it("builds the current ordering window for a delivery week", () => {
  expect(getOrderingWindowForDeliveryWeek(deliveryWeekStart)).toEqual({
    windowStart: expectedStart,
    windowEnd: expectedEnd,
  });
});
```

**Step 2: Run only the new test files**

Run: `bunx vitest run apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts apps/cms/lib/services/__tests__/order.service.test.ts apps/cms/lib/__tests__/stripe-service.test.ts`
Expected: FAIL until mocks, exports, or seams are in place.

**Step 3: Add minimal seams for testability without changing runtime behavior**

- Export pure helpers needed for rotation-window assertions.
- Isolate Prisma and Stripe mocks behind the new tests.
- Keep production behavior unchanged.

**Step 4: Run the targeted tests again**

Run: `bunx vitest run apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts apps/cms/lib/services/__tests__/order.service.test.ts apps/cms/lib/__tests__/stripe-service.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cms/package.json apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts apps/cms/lib/services/__tests__/order.service.test.ts apps/cms/lib/__tests__/stripe-service.test.ts apps/cms/lib/services/weekly-rotation.service.ts apps/cms/lib/services/order.service.ts apps/cms/lib/stripe-service.ts
git commit -m "test: lock current rotation and payment behavior"
```

### Task 3: Introduce Canonical Money Utilities

**Files:**
- Create: `packages/utils/src/money.ts`
- Create: `packages/utils/src/money.test.ts`
- Modify: `packages/utils/src/index.ts`
- Modify: `packages/utils/src/price-utils.ts`
- Test: `packages/utils/src/money.test.ts`

**Step 1: Write the failing money-rounding tests**

```ts
it("rounds cents deterministically", () => {
  expect(toMinorUnits(19.995)).toBe(2000);
});
```

```ts
it("adds decimal-like prices safely", () => {
  expect(addMoney(14.1, 0.2, 0.3)).toBe(14.6);
});
```

**Step 2: Run the new tests**

Run: `bunx vitest run packages/utils/src/money.test.ts`
Expected: FAIL because `money.ts` does not exist.

**Step 3: Add the minimal shared money helpers and route price-utils through them**

```ts
export function toMinorUnits(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromMinorUnits(amount: number): number {
  return amount / 100;
}

export function addMoney(...amounts: number[]): number {
  return fromMinorUnits(amounts.reduce((sum, value) => sum + toMinorUnits(value), 0));
}
```

**Step 4: Run both utility test files**

Run: `bunx vitest run packages/utils/src/money.test.ts packages/utils/src/price-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/utils/src/money.ts packages/utils/src/money.test.ts packages/utils/src/index.ts packages/utils/src/price-utils.ts packages/utils/src/price-utils.test.ts
git commit -m "refactor: add canonical money helpers"
```

### Task 4: Add Foundational Prisma Models for Rotation, Cart, and Guest Identity

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260310120000_foundations_phase_1/migration.sql`
- Modify: `packages/validators/src/checkout.schema.ts`
- Modify: `packages/validators/src/order.schema.ts`
- Modify: `packages/validators/src/index.ts`
- Modify: `packages/types/src/index.ts`
- Test: `packages/db/prisma/schema.prisma`

**Step 1: Write failing schema-adjacent type tests**

```ts
const settlementMethodSchema = z.enum(["STRIPE", "MEAL_PLAN_CREDITS"]);
```

```ts
type ApiCart = {
  id: string;
  settlementMethod: "STRIPE" | "MEAL_PLAN_CREDITS";
};
```

**Step 2: Run typecheck to verify the new cart types are missing**

Run: `bun run check-types`
Expected: FAIL because the new enums and types are not defined.

**Step 3: Add the foundational schema without switching runtime behavior**

- Add `RotationPeriod` and link it to `WeeklyRotation`.
- Add `Cart` and `CartItem`.
- Add guest fields to `User`, including `isGuest`, merge metadata, and guest
  source fields.
- Add order-time customer snapshot fields to `Order`.
- Add settlement enums shared by validators and API types.

Minimal shape to introduce:

```prisma
model RotationPeriod {
  id          String           @id @default(cuid())
  name        String
  status      RotationStatus   @default(DRAFT)
  rotations   WeeklyRotation[]
  meals       Meal[]           @relation("RotationPeriodMeals")
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

```prisma
model Cart {
  id               String           @id @default(cuid())
  userId           String
  settlementMethod SettlementMethod
  status           CartStatus       @default(ACTIVE)
  items            CartItem[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}
```

**Step 4: Generate Prisma client and rerun typecheck**

Run: `bun run db:generate && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260310120000_foundations_phase_1/migration.sql packages/validators/src/checkout.schema.ts packages/validators/src/order.schema.ts packages/validators/src/index.ts packages/types/src/index.ts
git commit -m "feat(db): add rotation, cart, and guest foundations"
```

### Task 5: Add Meal Plan, Flavor Profile, Referral, and Decimal Money Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260310130000_meal_plan_profile_referral/migration.sql`
- Modify: `packages/types/src/index.ts`
- Modify: `packages/validators/src/user.schema.ts`
- Modify: `packages/validators/src/index.ts`
- Test: `packages/db/prisma/schema.prisma`

**Step 1: Write failing types for plan and profile models**

```ts
type ApiMealPlan = { remainingCredits: number; weeklyCreditCap: number };
type ApiFlavorProfile = { goals: string[]; involvement: "HANDS_ON" | "HANDS_OFF" };
```

**Step 2: Run typecheck to verify the new types do not exist yet**

Run: `bun run check-types`
Expected: FAIL

**Step 3: Extend the schema and move money fields to `Decimal` where justified**

- Add `MealPlan`, `MealPlanWindowUsage`, and `MealPlanCreditLedger`.
- Add `FlavorProfile`.
- Add `ReferralCode` and `ReferralUse`.
- Change pricing fields such as `Meal.price`, `Order.unitPrice`,
  `Order.totalAmount`, `Order.refundAmount`, and checkout-adjacent fields from
  `Float` to `Decimal`.

Minimal ledger shape:

```prisma
model MealPlanCreditLedger {
  id          String                @id @default(cuid())
  mealPlanId  String
  eventType   MealPlanLedgerEvent
  creditDelta Int
  createdAt   DateTime              @default(now())
}
```

**Step 4: Generate Prisma client and rerun typecheck**

Run: `bun run db:generate && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260310130000_meal_plan_profile_referral/migration.sql packages/types/src/index.ts packages/validators/src/user.schema.ts packages/validators/src/index.ts
git commit -m "feat(db): add meal plan, profile, referral, and decimal money models"
```

### Task 6: Rewrite Rotation Scheduling to the New Thursday 3pm Rules

**Files:**
- Create: `apps/cms/lib/services/rotation-schedule.ts`
- Create: `apps/cms/lib/services/__tests__/rotation-schedule.test.ts`
- Modify: `apps/cms/lib/services/weekly-rotation.service.ts`
- Modify: `apps/cms/app/api/rotation/route.ts`
- Modify: `apps/cms/app/api/rotation/active/route.ts`
- Modify: `apps/cms/app/api/cron/rotation-flip/route.ts`
- Test: `apps/cms/lib/services/__tests__/rotation-schedule.test.ts`

**Step 1: Write failing target-state scheduling tests**

```ts
it("opens ordering on Thursday at 3:00pm Toronto", () => {
  expect(resolveOrderingWindow(now)).toEqual({
    startsAt: expectedStart,
    endsAt: expectedEnd,
  });
});
```

```ts
it("groups two delivery weeks into one rotation period", () => {
  expect(resolveRotationPeriodKey(weekStartA)).toBe(resolveRotationPeriodKey(weekStartB));
});
```

**Step 2: Run the target scheduling tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/rotation-schedule.test.ts`
Expected: FAIL under the current Wednesday-Tuesday logic.

**Step 3: Add the dedicated scheduling module and route services through it**

```ts
export const BUSINESS_TIMEZONE = "America/Toronto";
export const ORDERING_OPEN = { day: 4, hour: 15, minute: 0 } as const;
export const ORDERING_CLOSE = { day: 4, hour: 14, minute: 59, second: 59 } as const;
```

- Move date logic out of `weekly-rotation.service.ts` into pure functions.
- Ensure `WeeklyRotation` still powers operations while `RotationPeriod` groups
  the shared menu.

**Step 4: Run tests and typecheck**

Run: `bunx vitest run apps/cms/lib/services/__tests__/rotation-schedule.test.ts && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cms/lib/services/rotation-schedule.ts apps/cms/lib/services/__tests__/rotation-schedule.test.ts apps/cms/lib/services/weekly-rotation.service.ts apps/cms/app/api/rotation/route.ts apps/cms/app/api/rotation/active/route.ts apps/cms/app/api/cron/rotation-flip/route.ts
git commit -m "feat(cms): rewrite rotation scheduling for thursday cutoff"
```

### Task 7: Remove Signature-Meal Assumptions

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `apps/cms/lib/services/weekly-rotation.service.ts`
- Modify: `apps/cms/lib/services/meal.service.ts`
- Modify: `apps/cms/app/api/meals/route.ts`
- Modify: `apps/web/lib/cms-api.ts`
- Modify: `apps/web/app/menu/page.tsx`
- Modify: `apps/web/components/menu/meal-grid.tsx`
- Test: `apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts`

**Step 1: Write failing tests and assertions for rotating-only availability**

```ts
it("returns orderable rotating meals without signature fallback", async () => {
  expect(result.signatureMeals).toBeUndefined();
  expect(result.meals).toHaveLength(3);
});
```

**Step 2: Run the affected tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts`
Expected: FAIL because the service still includes signature meals.

**Step 3: Remove the old assumption from schema and service contracts**

- Deprecate `SIGNATURE` reads and stop exposing `signatureMeals` in API results.
- Make rotating meals the storefront default.
- Preserve admin access to inactive or draft meals separately from customer
  availability.

**Step 4: Run tests and typecheck**

Run: `bunx vitest run apps/cms/lib/services/__tests__/weekly-rotation.service.test.ts && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma apps/cms/lib/services/weekly-rotation.service.ts apps/cms/lib/services/meal.service.ts apps/cms/app/api/meals/route.ts apps/web/lib/cms-api.ts apps/web/app/menu/page.tsx apps/web/components/menu/meal-grid.tsx
git commit -m "refactor: remove signature meal assumptions"
```

### Task 8: Replace Single-Meal Checkout With Cart-Based Stripe Checkout

**Files:**
- Create: `apps/cms/lib/services/cart.service.ts`
- Create: `apps/cms/lib/services/cart-checkout.service.ts`
- Create: `apps/cms/app/api/carts/route.ts`
- Create: `apps/cms/app/api/carts/[id]/route.ts`
- Create: `apps/cms/app/api/carts/[id]/checkout/route.ts`
- Create: `apps/cms/lib/services/__tests__/cart-checkout.service.test.ts`
- Modify: `apps/cms/app/api/checkout/route.ts`
- Modify: `apps/cms/lib/stripe-service.ts`
- Modify: `apps/cms/app/api/webhooks/stripe/route.ts`
- Modify: `packages/validators/src/checkout.schema.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `apps/web/app/api/checkout/route.ts`
- Modify: `apps/web/components/order/order-page-client.tsx`
- Modify: `apps/web/components/order/order-summary.tsx`
- Test: `apps/cms/lib/services/__tests__/cart-checkout.service.test.ts`

**Step 1: Write failing tests for multi-item Stripe carts**

```ts
it("creates one stripe session with multiple line items", async () => {
  expect(session.line_items).toHaveLength(2);
});
```

```ts
it("creates one order per cart item after webhook finalization", async () => {
  expect(createdOrders).toHaveLength(2);
});
```

**Step 2: Run the cart checkout tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/cart-checkout.service.test.ts`
Expected: FAIL because cart services and routes do not exist.

**Step 3: Build the rewritten cart pipeline**

Minimal contract additions:

```ts
export const settlementMethodSchema = z.enum(["STRIPE", "MEAL_PLAN_CREDITS"]);

export const createCartSchema = z.object({
  rotationId: z.string(),
  settlementMethod: settlementMethodSchema,
  items: z.array(z.object({ mealId: z.string(), quantity: z.number().int().min(1) })),
});
```

- Move Stripe session creation to cart checkout service.
- Treat `apps/cms/app/api/checkout/route.ts` as a compatibility wrapper or retire
  it once `apps/web` uses `/api/carts/:id/checkout`.
- Ensure webhook finalization resolves by cart/session and fans out to multiple
  `Order` records.

**Step 4: Run cart tests, typecheck, and lint**

Run: `bunx vitest run apps/cms/lib/services/__tests__/cart-checkout.service.test.ts && bun run check-types && bun run lint`
Expected: PASS, with only pre-existing unrelated warnings allowed.

**Step 5: Commit**

```bash
git add apps/cms/lib/services/cart.service.ts apps/cms/lib/services/cart-checkout.service.ts apps/cms/app/api/carts/route.ts apps/cms/app/api/carts/[id]/route.ts apps/cms/app/api/carts/[id]/checkout/route.ts apps/cms/lib/services/__tests__/cart-checkout.service.test.ts apps/cms/app/api/checkout/route.ts apps/cms/lib/stripe-service.ts apps/cms/app/api/webhooks/stripe/route.ts packages/validators/src/checkout.schema.ts packages/types/src/index.ts apps/web/app/api/checkout/route.ts apps/web/components/order/order-page-client.tsx apps/web/components/order/order-summary.tsx
git commit -m "feat(checkout): replace single-meal flow with cart stripe checkout"
```

### Task 9: Add Guest Checkout and Ghost-User Merge Safety

**Files:**
- Create: `apps/cms/lib/services/guest-user.service.ts`
- Create: `apps/cms/lib/services/__tests__/guest-user.service.test.ts`
- Modify: `apps/cms/lib/services/user.service.ts`
- Modify: `apps/cms/app/api/users/[id]/route.ts`
- Modify: `apps/cms/app/api/carts/[id]/checkout/route.ts`
- Modify: `packages/validators/src/auth.schema.ts`
- Modify: `packages/validators/src/checkout.schema.ts`
- Modify: `apps/web/app/api/checkout/route.ts`
- Modify: `apps/web/components/order/order-page-client.tsx`
- Test: `apps/cms/lib/services/__tests__/guest-user.service.test.ts`

**Step 1: Write failing tests for guest-user creation and conservative merge rules**

```ts
it("creates a guest user for anonymous checkout", async () => {
  expect(user.isGuest).toBe(true);
});
```

```ts
it("does not auto-merge conflicting guest identities", async () => {
  expect(result.requiresReview).toBe(true);
});
```

**Step 2: Run the guest-user tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/guest-user.service.test.ts`
Expected: FAIL because guest-user service does not exist.

**Step 3: Add guest checkout support and conservative merge behavior**

- Allow the web checkout route to proceed with authenticated users or guest
  payloads.
- Create or reuse a guest user before cart finalization.
- Only auto-upgrade on exact normalized email match after authenticated sign-in.

**Step 4: Run tests and typecheck**

Run: `bunx vitest run apps/cms/lib/services/__tests__/guest-user.service.test.ts && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cms/lib/services/guest-user.service.ts apps/cms/lib/services/__tests__/guest-user.service.test.ts apps/cms/lib/services/user.service.ts apps/cms/app/api/users/[id]/route.ts apps/cms/app/api/carts/[id]/checkout/route.ts packages/validators/src/auth.schema.ts packages/validators/src/checkout.schema.ts apps/web/app/api/checkout/route.ts apps/web/components/order/order-page-client.tsx
git commit -m "feat(identity): add guest checkout and ghost-user rules"
```

### Task 10: Persist the Onboarding Questionnaire as Flavor Profile Data

**Files:**
- Create: `apps/cms/lib/services/flavor-profile.service.ts`
- Create: `apps/cms/app/api/onboarding/route.ts`
- Create: `apps/cms/lib/services/__tests__/flavor-profile.service.test.ts`
- Modify: `packages/validators/src/user.schema.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `apps/web/app/onboarding/page.tsx`
- Modify: `apps/web/app/(auth)/sign-up/page.tsx`
- Modify: `apps/web/components/auth/sign-up-form.tsx`
- Modify: `apps/web/components/auth/profile-setup-form.tsx`
- Modify: `apps/cms/app/api/users/[id]/route.ts`
- Test: `apps/cms/lib/services/__tests__/flavor-profile.service.test.ts`

**Step 1: Write failing tests for questionnaire persistence**

```ts
it("saves goals, restrictions, preferences, and involvement mode", async () => {
  expect(profile.involvement).toBe("HANDS_OFF");
});
```

**Step 2: Run the flavor-profile tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/flavor-profile.service.test.ts`
Expected: FAIL because the service and route do not exist.

**Step 3: Implement minimal persistence and redirect wiring**

- Save questionnaire state in CMS.
- Redirect post-signup users to `/onboarding`.
- Allow skip steps while keeping completion status explicit.
- Expose profile editing to CMS user routes.

**Step 4: Run tests and typecheck**

Run: `bunx vitest run apps/cms/lib/services/__tests__/flavor-profile.service.test.ts && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cms/lib/services/flavor-profile.service.ts apps/cms/app/api/onboarding/route.ts apps/cms/lib/services/__tests__/flavor-profile.service.test.ts packages/validators/src/user.schema.ts packages/types/src/index.ts apps/web/app/onboarding/page.tsx apps/web/app/(auth)/sign-up/page.tsx apps/web/components/auth/sign-up-form.tsx apps/web/components/auth/profile-setup-form.tsx apps/cms/app/api/users/[id]/route.ts
git commit -m "feat(profile): persist onboarding flavor profile"
```

### Task 11: Add Meal Plan Purchase, Ledger, and Credit Redemption

**Files:**
- Create: `apps/cms/lib/services/meal-plan.service.ts`
- Create: `apps/cms/lib/services/meal-plan-ledger.service.ts`
- Create: `apps/cms/lib/services/__tests__/meal-plan.service.test.ts`
- Create: `apps/cms/app/api/meal-plans/route.ts`
- Create: `apps/cms/app/api/meal-plans/[id]/usage/route.ts`
- Modify: `apps/cms/lib/services/cart-checkout.service.ts`
- Modify: `packages/validators/src/checkout.schema.ts`
- Modify: `packages/types/src/index.ts`
- Modify: `apps/web/app/profile/page.tsx`
- Modify: `apps/web/app/settings/order-stats/page.tsx`
- Test: `apps/cms/lib/services/__tests__/meal-plan.service.test.ts`

**Step 1: Write failing ledger and weekly-cap tests**

```ts
it("blocks redemption above weekly cap", async () => {
  await expect(redeemCart(cart)).rejects.toThrow("weekly credit cap");
});
```

```ts
it("creates purchase and redemption ledger entries", async () => {
  expect(entries.map((entry) => entry.eventType)).toEqual(["PURCHASE", "REDEMPTION"]);
});
```

**Step 2: Run the meal-plan tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/meal-plan.service.test.ts`
Expected: FAIL because plan services do not exist.

**Step 3: Implement purchase, balance, and credit-backed checkout**

- Add purchase and activation flow.
- Enforce `weeklyCreditCap` and `remainingCredits` in CMS only.
- Allow cart checkout to bypass Stripe when settlement method is
  `MEAL_PLAN_CREDITS` and the cart is fully covered.
- Reject hybrid carts in v1.

**Step 4: Run tests, typecheck, and targeted lint**

Run: `bunx vitest run apps/cms/lib/services/__tests__/meal-plan.service.test.ts && bun run check-types && bun run lint --filter=cms`
Expected: PASS, with only pre-existing warnings allowed.

**Step 5: Commit**

```bash
git add apps/cms/lib/services/meal-plan.service.ts apps/cms/lib/services/meal-plan-ledger.service.ts apps/cms/lib/services/__tests__/meal-plan.service.test.ts apps/cms/app/api/meal-plans/route.ts apps/cms/app/api/meal-plans/[id]/usage/route.ts apps/cms/lib/services/cart-checkout.service.ts packages/validators/src/checkout.schema.ts packages/types/src/index.ts apps/web/app/profile/page.tsx apps/web/app/settings/order-stats/page.tsx
git commit -m "feat(meal-plans): add ledger-backed credit redemption"
```

### Task 12: Add Hands OFF Assignment Workflow and Admin Views

**Files:**
- Create: `apps/cms/lib/services/hands-off-assignment.service.ts`
- Create: `apps/cms/lib/services/__tests__/hands-off-assignment.service.test.ts`
- Create: `apps/cms/app/api/assignments/route.ts`
- Modify: `apps/cms/app/dashboard/orders/`
- Modify: `apps/cms/app/dashboard/rotation/`
- Modify: `apps/cms/app/api/reports/prep-sheet/route.ts`
- Modify: `apps/web/app/profile/page.tsx`
- Test: `apps/cms/lib/services/__tests__/hands-off-assignment.service.test.ts`

**Step 1: Write failing tests for assignment eligibility and credit deduction**

```ts
it("creates assignments for hands-off users from the active rotation", async () => {
  expect(result.assignedMeals).toHaveLength(weeklyCreditCap);
});
```

**Step 2: Run the assignment tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/hands-off-assignment.service.test.ts`
Expected: FAIL because the service does not exist.

**Step 3: Implement the workflow and reporting hooks**

- Build a queue of users needing assignment.
- Use current rotation meals plus flavor-profile constraints.
- Deduct credits only when assignment is committed.
- Surface assigned meals in CMS and the customer account view.

**Step 4: Run tests and typecheck**

Run: `bunx vitest run apps/cms/lib/services/__tests__/hands-off-assignment.service.test.ts && bun run check-types`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/cms/lib/services/hands-off-assignment.service.ts apps/cms/lib/services/__tests__/hands-off-assignment.service.test.ts apps/cms/app/api/assignments/route.ts apps/cms/app/dashboard/orders apps/cms/app/dashboard/rotation apps/cms/app/api/reports/prep-sheet/route.ts apps/web/app/profile/page.tsx
git commit -m "feat(cms): add hands-off assignment workflow"
```

### Task 13: Add Referral Admin Support and Final Rollout Verification

**Files:**
- Create: `apps/cms/lib/services/referral.service.ts`
- Create: `apps/cms/app/api/referrals/route.ts`
- Create: `apps/cms/lib/services/__tests__/referral.service.test.ts`
- Modify: `apps/cms/app/api/webhooks/stripe/route.ts`
- Modify: `apps/cms/lib/services/order.service.ts`
- Modify: `README.md`
- Modify: `docs/fwe-product-architecture-plan.md`
- Test: `apps/cms/lib/services/__tests__/referral.service.test.ts`

**Step 1: Write failing tests for schema-backed referral admin behavior**

```ts
it("creates and deactivates referral codes without touching checkout ux", async () => {
  expect(code.active).toBe(true);
});
```

**Step 2: Run the referral tests**

Run: `bunx vitest run apps/cms/lib/services/__tests__/referral.service.test.ts`
Expected: FAIL because the service and route do not exist.

**Step 3: Implement admin-only referral support and finish rollout docs**

- Add admin CRUD for referral records only.
- Keep customer-facing referral entry deferred.
- Update architecture docs and rollout notes to reflect final interfaces.
- Re-run payment-event reconciliation checks after all commerce rewrites.

**Step 4: Run full verification**

Run: `bunx vitest run && bun run check-types && bun run lint && bun run build`
Expected: PASS, with only already-known non-blocking lint warnings remaining if they were intentionally deferred.

**Step 5: Commit**

```bash
git add apps/cms/lib/services/referral.service.ts apps/cms/app/api/referrals/route.ts apps/cms/lib/services/__tests__/referral.service.test.ts apps/cms/app/api/webhooks/stripe/route.ts apps/cms/lib/services/order.service.ts README.md docs/fwe-product-architecture-plan.md
git commit -m "docs: finalize rollout verification and referral admin support"
```

## Rollout Notes

- If `OrderIntent` becomes dead weight during Task 8, remove it in a dedicated
  cleanup branch instead of keeping a fragile adapter indefinitely.
- If Decimal migration reveals too much conversion churn, finish schema migration
  first and then do a focused application-layer type pass before resuming the
  checkout rewrite.
- If guest-user auto-merge causes ambiguity, fall back to admin-reviewed merge
  immediately rather than widening the automatic rule.
- Do not ship hybrid credit + Stripe carts in v1.

## Verification Checklist Per Branch

- `bunx vitest run <targeted-files>`
- `bun run check-types`
- `bun run lint`
- `bun run build` for user-visible or route-level changes
- Manual checkout and webhook smoke test for payment-related branches

Plan complete and saved to `docs/plans/2026-03-10-business-safe-rollout.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
