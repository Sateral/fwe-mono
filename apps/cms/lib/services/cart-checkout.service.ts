import type Stripe from "stripe";
import type { CartCheckoutRequest, CreateOrderInput } from "@fwe/validators";
import { Prisma } from "@fwe/db";
import {
  formatLineItemDescription,
  formatModifiersSummary,
  formatSubstitutionsSummary,
} from "@fwe/utils/format-utils";

import prisma from "@/lib/prisma";
import { mealPlanService } from "@/lib/services/meal-plan.service";
import { stripe } from "@/lib/stripe";
import { orderService } from "@/lib/services/order.service";

// ============================================
// Constants
// ============================================

const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

// ============================================
// Types
// ============================================

/** Substitution / modifier row shape from junction tables. */
interface CustomizationRow {
  id: string;
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string;
}

/**
 * Cart shape after Prisma includes (items → meal, rotation, substitutions, modifiers).
 * Used internally by all checkout helpers.
 */
type CheckoutCart = {
  id: string;
  userId: string;
  settlementMethod: "STRIPE" | "MEAL_PLAN_CREDITS";
  status: string;
  items: Array<{
    id: string;
    mealId: string;
    rotationId: string | null;
    quantity: number;
    unitPrice: Prisma.Decimal | number;
    substitutions: CustomizationRow[];
    modifiers: CustomizationRow[];
    notes: string | null;
    meal: {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      description?: string | null;
    };
  }>;
};

type CheckoutCartItem = CheckoutCart["items"][number];

/**
 * Immutable snapshot persisted to `CheckoutSession` + `CheckoutSessionItem`.
 *
 * Created *before* the Stripe session so that webhook finalization always
 * reads what the customer actually paid for, even if the live cart was
 * edited between checkout and payment.
 */
type CheckoutSnapshot = {
  id: string;
  clientRequestId: string | null;
  status: string;
  cartId: string;
  /** Present on real `CheckoutSession` rows; required for order creation. */
  userId: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  customerEmail: string;
  customerName: string | null;
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation: string | null;
  items: Array<{
    id: string;
    orderIntentId: string;
    mealId: string;
    mealName: string;
    mealSlug: string;
    mealImageUrl: string | null;
    rotationId: string;
    quantity: number;
    unitPrice: Prisma.Decimal | number;
    totalAmount: Prisma.Decimal | number;
    currency: string;
    substitutions: CustomizationRow[];
    modifiers: CustomizationRow[];
    notes: string | null;
    deliveryMethod: "DELIVERY" | "PICKUP";
    pickupLocation: string | null;
  }>;
};

type CheckoutSnapshotItem = CheckoutSnapshot["items"][number];

// ============================================
// Prisma Includes
// ============================================

const checkoutCartInclude = {
  items: {
    include: {
      meal: {
        include: {
          substitutionGroups: { include: { options: true } },
          modifierGroups: { include: { options: true } },
          tags: true,
        },
      },
      rotation: true,
      substitutions: true,
      modifiers: true,
    },
  },
};

const checkoutSnapshotInclude = {
  items: {
    include: {
      substitutions: true,
      modifiers: true,
    },
  },
};

// ============================================
// Helpers — Value Conversion & Error Detection
// ============================================

/** Safely convert `Prisma.Decimal | number` → plain `number`. */
function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : new Prisma.Decimal(value).toNumber();
}

/** True when a Prisma error is a unique-constraint violation (P2002). */
function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// ============================================
// Helpers — Idempotency Keys
// ============================================

/**
 * These helpers build deterministic keys so that retries never create
 * duplicate checkout sessions or order intents.
 */

function getCheckoutSessionIdFromSession(session: Stripe.Checkout.Session) {
  return session.metadata?.checkoutSessionId || null;
}

function getCheckoutSessionClientRequestId(
  cartId: string,
  requestId?: string,
) {
  return requestId ? `${requestId}:${cartId}` : cartId;
}

function getOrderIntentClientRequestId(
  cartId: string,
  itemId: string,
  requestId?: string,
) {
  return requestId ? `${requestId}:${cartId}:${itemId}` : `${cartId}:${itemId}`;
}

// ============================================
// Helpers — Stripe Line Items
// ============================================

/**
 * Build a Stripe `line_items` entry from a live cart item.
 * Called on the initial (fresh) checkout path.
 */
function buildLineItem(
  item: CheckoutCartItem,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation?: string,
) {
  const description = formatLineItemDescription(
    item.meal,
    item.substitutions,
    item.modifiers,
    item.notes ?? undefined,
    deliveryMethod,
    pickupLocation,
  );

  return {
    price_data: {
      currency: "cad",
      product_data: {
        name: item.meal.name,
        description: description.substring(0, 1000),
        ...(item.meal.imageUrl ? { images: [item.meal.imageUrl] } : {}),
      },
      unit_amount: Math.round(toNumber(item.unitPrice) * 100),
    },
    quantity: item.quantity,
  };
}

/**
 * Build a Stripe `line_items` entry from a persisted snapshot item.
 * Called when retrying an expired/failed Stripe session.
 */
function buildLineItemFromSnapshot(item: CheckoutSnapshotItem) {
  return buildLineItem(
    {
      id: item.id,
      mealId: item.mealId,
      rotationId: item.rotationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      substitutions: item.substitutions,
      modifiers: item.modifiers,
      notes: item.notes,
      meal: {
        id: item.mealId,
        name: item.mealName,
        slug: item.mealSlug,
        imageUrl: item.mealImageUrl,
      },
    },
    item.deliveryMethod,
    item.pickupLocation ?? undefined,
  );
}

/** Build Stripe `metadata` with summary fields (truncated for Stripe 500-char limit). */
function buildStripeMetadata(
  cart: CheckoutCart,
  snapshot: CheckoutSnapshot,
  items: Array<{ substitutions: CustomizationRow[]; modifiers: CustomizationRow[] }>,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation?: string,
) {
  const substitutionsSummary = formatSubstitutionsSummary(
    items.flatMap((item) => item.substitutions).slice(0, 10),
  ).slice(0, 200);
  const modifiersSummary = formatModifiersSummary(
    items.flatMap((item) => item.modifiers).slice(0, 10),
  ).slice(0, 200);

  return {
    cartId: cart.id,
    checkoutSessionId: snapshot.id,
    userId: cart.userId,
    userName: snapshot.customerName ?? "",
    itemCount: items.length.toString(),
    substitutionsSummary,
    modifiersSummary,
    deliveryMethod,
    pickupLocation: pickupLocation ?? "",
  };
}

// ============================================
// Helpers — OrderIntent & Snapshot Persistence
// ============================================

/**
 * Find-or-create an `OrderIntent` for a single cart item.
 *
 * Uses `clientRequestId` + unique constraint recovery to guarantee
 * idempotent intent creation, even under concurrent retries.
 */
async function ensureOrderIntentForCartItem(
  cart: CheckoutCart,
  item: CheckoutCart["items"][number],
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation: string | undefined,
  requestId?: string,
) {
  const clientRequestId = getOrderIntentClientRequestId(cart.id, item.id, requestId);
  const existing = await prisma.orderIntent.findFirst({
    where: {
      clientRequestId,
      mealId: item.mealId,
      userId: cart.userId,
    },
  });

  if (existing) {
    // Update existing intent to reflect any cart changes (e.g. quantity/mods)
    return prisma.orderIntent.update({
      where: { id: existing.id },
      data: {
        quantity: item.quantity,
        totalAmount: toNumber(item.unitPrice) * item.quantity,
        notes: item.notes,
        deliveryMethod,
        pickupLocation: deliveryMethod === "PICKUP" ? pickupLocation : undefined,
        // Junction tables for OrderIntent are handled separately if needed
      },
    });
  }

  try {
    return await prisma.orderIntent.create({
      data: {
        clientRequestId,
        userId: cart.userId,
        mealId: item.mealId,
        rotationId: item.rotationId ?? cart.items[0]?.rotationId ?? "",
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        totalAmount: toNumber(item.unitPrice) * item.quantity,
        currency: "cad",
        settlementMethod: cart.settlementMethod,
        notes: item.notes,
        deliveryMethod,
        pickupLocation: deliveryMethod === "PICKUP" ? pickupLocation : undefined,
        status: "CREATED",
        substitutions: {
          create: item.substitutions.map((s) => ({
            groupName: s.groupName,
            optionName: s.optionName,
            groupId: s.groupId,
            optionId: s.optionId,
          })),
        },
        modifiers: {
          create: item.modifiers.map((m) => ({
            groupName: m.groupName,
            optionName: m.optionName,
            groupId: m.groupId,
            optionId: m.optionId,
          })),
        },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const recovered = await prisma.orderIntent.findFirst({
        where: {
          clientRequestId,
          mealId: item.mealId,
          userId: cart.userId,
        },
      });

      if (recovered) {
        return recovered;
      }
    }

    throw error;
  }
}

/** Fetch the checkout cart with full meal/rotation includes. */
async function getCheckoutCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: checkoutCartInclude,
  }) as Promise<CheckoutCart | null>;
}

/**
 * Find an existing snapshot by `clientRequestId` or by active status.
 * Used to resume a checkout that was started but not completed.
 */
async function getExistingCheckoutSnapshot(
  cartId: string,
  requestId?: string,
) {
  return prisma.checkoutSession.findFirst({
    where: {
      OR: [
        { clientRequestId: getCheckoutSessionClientRequestId(cartId, requestId) },
        { cartId, status: "SESSION_CREATED" },
      ],
    },
    include: checkoutSnapshotInclude,
  }) as Promise<CheckoutSnapshot | null>;
}

async function getCheckoutSnapshotByStripeSessionId(stripeSessionId: string) {
  return prisma.checkoutSession.findUnique({
    where: { stripeSessionId },
    include: checkoutSnapshotInclude,
  }) as Promise<CheckoutSnapshot | null>;
}

/** Resolve immutable checkout snapshot for a Stripe Checkout session (metadata or Stripe session id). */
export async function loadCheckoutSnapshotForStripeSession(
  session: Stripe.Checkout.Session,
): Promise<CheckoutSnapshot | null> {
  const checkoutSessionId = getCheckoutSessionIdFromSession(session);
  if (checkoutSessionId) {
    const row = await prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      include: checkoutSnapshotInclude,
    });
    return row as CheckoutSnapshot | null;
  }
  return getCheckoutSnapshotByStripeSessionId(session.id);
}

/** Build per-line `CreateOrderInput` from snapshot + Stripe payment ids (no `orderGroupId`). */
export function buildCreateOrderInputsFromCheckoutSnapshot(
  snapshot: CheckoutSnapshot,
  session: Stripe.Checkout.Session,
  paymentIntentId: string | undefined,
  stripeChargeId: string | undefined,
  stripeBalanceTransactionId: string | undefined,
): CreateOrderInput[] {
  return snapshot.items.map((item) => {
    const substitutions = item.substitutions.map((s) => ({
      groupName: s.groupName,
      optionName: s.optionName,
      groupId: s.groupId ?? undefined,
      optionId: s.optionId ?? undefined,
    }));
    const modifiers = item.modifiers.map((m) => ({
      groupName: m.groupName,
      optionName: m.optionName,
      groupId: m.groupId ?? undefined,
      optionId: m.optionId ?? undefined,
    }));
    return {
      userId: snapshot.userId,
      mealId: item.mealId,
      rotationId: item.rotationId,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      totalAmount: toNumber(item.totalAmount),
      currency: item.currency,
      orderIntentId: item.orderIntentId,
      checkoutSessionId: snapshot.id,
      substitutions,
      modifiers,
      notes: item.notes ?? undefined,
      deliveryMethod: item.deliveryMethod,
      pickupLocation: item.pickupLocation ?? undefined,
      customerEmail: snapshot.customerEmail,
      customerName: snapshot.customerName ?? undefined,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? undefined,
      stripeChargeId,
      stripeBalanceTransactionId,
    };
  });
}

// ============================================
// Settlement: Meal-Plan Credits (no Stripe)
// ============================================

/**
 * Complete checkout using meal-plan credits.
 *
 * Steps:
 * 1. Verify the user has enough credits (rejects hybrid carts in v1).
 * 2. Create order intents for each cart item.
 * 3. Inside a transaction: redeem credits → create orders → mark cart checked out.
 */
async function finalizeMealPlanCart(
  cart: CheckoutCart,
  input: { cartId: string } & CartCheckoutRequest,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation: string | undefined,
) {
  const creditsRequired = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const mealPlanSummary = await mealPlanService.getPlanSummaryByUserId(cart.userId);

  if (!mealPlanSummary) {
    throw new Error("No active meal plan found");
  }

  if (
    mealPlanSummary.remainingCredits < creditsRequired ||
    mealPlanSummary.currentWeekCreditsRemaining < creditsRequired
  ) {
    throw new Error("Hybrid carts are not supported in v1");
  }

  const orderIntents: Array<{ id: string; rotationId: string }> = [];
  for (const item of cart.items) {
    orderIntents.push(
      await ensureOrderIntentForCartItem(
        cart,
        item,
        deliveryMethod,
        pickupLocation,
        input.requestId,
      ),
    );
  }

  await prisma.$transaction(async (tx) => {
    await mealPlanService.redeemCart(cart, new Date(), tx);

    for (const [index, item] of cart.items.entries()) {
      const existingOrder = await tx.order.findFirst({
        where: {
          orderIntentId: orderIntents[index]!.id,
        },
      });

      if (!existingOrder) {
        await tx.order.create({
          data: {
            userId: cart.userId,
            mealId: item.mealId,
            rotationId: item.rotationId ?? orderIntents[index]!.rotationId,
            settlementMethod: cart.settlementMethod,
            quantity: item.quantity,
            unitPrice: toNumber(item.unitPrice),
            totalAmount: toNumber(item.unitPrice) * item.quantity,
            orderIntentId: orderIntents[index]!.id,
            substitutions: {
              create: item.substitutions.map((s) => ({
                groupName: s.groupName,
                optionName: s.optionName,
                groupId: s.groupId,
                optionId: s.optionId,
              })),
            },
            modifiers: {
              create: item.modifiers.map((m) => ({
                groupName: m.groupName,
                optionName: m.optionName,
                groupId: m.groupId,
                optionId: m.optionId,
              })),
            },
            notes: item.notes,
            deliveryMethod,
            pickupLocation,
            paymentStatus: "PAID",
            fulfillmentStatus: "NEW",
            currency: "cad",
            paidAt: new Date(),
            customerEmail: input.userEmail,
            customerName: input.userName ?? undefined,
          },
        });
      }
    }

    await tx.orderIntent.updateMany({
      where: {
        id: { in: orderIntents.map((intent) => intent.id) },
      },
      data: {
        status: "PAID",
      },
    });

    await tx.cart.update({
      where: { id: cart.id },
      data: { status: "CHECKED_OUT" },
    });
  });

  return {
    id: `meal-plan-${cart.id}`,
    url: null,
  };
}

// ============================================
// Settlement: Stripe Checkout
// ============================================

/**
 * Resume an existing snapshot by creating a *new* Stripe session from it.
 *
 * Called when a previous Stripe session expired or failed but the snapshot
 * (and its order intents) are still valid. Line items are rebuilt from the
 * snapshot — not the live cart — so the customer pays for what was originally
 * captured.
 */
async function createStripeSessionFromSnapshot(
  cart: CheckoutCart,
  snapshot: CheckoutSnapshot,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation: string | undefined,
) {
  const metadata = buildStripeMetadata(
    cart,
    snapshot,
    snapshot.items,
    deliveryMethod,
    pickupLocation,
  );

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: snapshot.customerEmail,
      currency: "cad",
      client_reference_id: cart.id,
      line_items: snapshot.items.map((item) =>
        buildLineItemFromSnapshot(item),
      ),
      metadata,
      success_url: `${WEB_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEB_BASE_URL}/menu`,
    },
    {
      idempotencyKey: `${snapshot.id}:retry:${snapshot.stripeSessionId ?? "unknown"}`,
    },
  );

  await prisma.checkoutSession.update({
    where: { id: snapshot.id },
    data: {
      status: "SESSION_CREATED",
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    },
  });

  await prisma.orderIntent.updateMany({
    where: {
      id: { in: snapshot.items.map((item) => item.orderIntentId) },
    },
    data: {
      status: "SESSION_CREATED",
    },
  });

  return {
    id: session.id,
    url: session.url,
  };
}

/**
 * Create a brand-new snapshot + Stripe session from the live cart.
 *
 * Steps:
 * 1. Create order intents (one per cart item, idempotent).
 * 2. Persist a `CheckoutSession` snapshot with all line-item details.
 * 3. Create a Stripe Checkout Session using the snapshot ID as idempotency key.
 * 4. Update snapshot + intents with the Stripe session reference.
 */
async function createFreshStripeSession(
  cart: CheckoutCart,
  input: { cartId: string } & CartCheckoutRequest,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation: string | undefined,
) {
  // Step 1 — Order Intents
  const orderIntents: Array<{ id: string; rotationId: string }> = [];
  for (const item of cart.items) {
    orderIntents.push(
      await ensureOrderIntentForCartItem(
        cart,
        item,
        deliveryMethod,
        pickupLocation,
        input.requestId,
      ),
    );
  }

  // Step 2 — Checkout Snapshot
  const checkoutClientRequestId = getCheckoutSessionClientRequestId(
    cart.id,
    input.requestId,
  );

  let snapshot: CheckoutSnapshot | null = null;

  try {
    snapshot = (await prisma.checkoutSession.create({
      data: {
        clientRequestId: checkoutClientRequestId,
        cartId: cart.id,
        userId: cart.userId,
        settlementMethod: cart.settlementMethod,
        status: "CREATED",
        customerEmail: input.userEmail,
        customerName: input.userName,
        deliveryMethod,
        pickupLocation,
        items: {
          create: cart.items.map((item, index) => ({
            orderIntentId: orderIntents[index]!.id,
            mealId: item.mealId,
            mealName: item.meal.name,
            mealSlug: item.meal.slug,
            mealImageUrl: item.meal.imageUrl,
            rotationId: item.rotationId ?? orderIntents[index]!.rotationId,
            quantity: item.quantity,
            unitPrice: toNumber(item.unitPrice),
            totalAmount: toNumber(item.unitPrice) * item.quantity,
            currency: "cad",
            notes: item.notes,
            deliveryMethod,
            pickupLocation,
            substitutions: {
              create: item.substitutions.map((s) => ({
                groupName: s.groupName,
                optionName: s.optionName,
                groupId: s.groupId,
                optionId: s.optionId,
              })),
            },
            modifiers: {
              create: item.modifiers.map((m) => ({
                groupName: m.groupName,
                optionName: m.optionName,
                groupId: m.groupId,
                optionId: m.optionId,
              })),
            },
          })),
        },
      },
      include: checkoutSnapshotInclude,
    })) as CheckoutSnapshot;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      snapshot = await getExistingCheckoutSnapshot(cart.id, input.requestId);
    } else {
      throw error;
    }
  }

  if (!snapshot) {
    throw new Error(`Checkout snapshot could not be created for cart ${cart.id}`);
  }

  // Step 3 — Stripe Session
  const metadata = buildStripeMetadata(
    cart,
    snapshot,
    cart.items,
    deliveryMethod,
    pickupLocation,
  );

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.userEmail,
      currency: "cad",
      client_reference_id: cart.id,
      line_items: cart.items.map((item) =>
        buildLineItem(item, deliveryMethod, pickupLocation),
      ),
      metadata,
      success_url: `${WEB_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEB_BASE_URL}/menu`,
    },
    {
      idempotencyKey: snapshot.id,
    },
  );

  // Step 4 — Link Stripe session back to our records
  await prisma.checkoutSession.update({
    where: { id: snapshot.id },
    data: {
      status: "SESSION_CREATED",
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    },
  });

  await prisma.orderIntent.updateMany({
    where: {
      id: { in: orderIntents.map((intent) => intent.id) },
    },
    data: {
      status: "SESSION_CREATED",
    },
  });

  return {
    id: session.id,
    url: session.url,
  };
}

// ============================================
// Helpers — Snapshot Staleness Detection
// ============================================

/**
 * Returns `true` when the snapshot line items still match the live cart.
 *
 * Compares by mealId, quantity, and unitPrice — if any differ the snapshot
 * is stale and the caller should expire the old Stripe session and create
 * a fresh one.
 */
function snapshotMatchesCart(
  snapshot: CheckoutSnapshot,
  cart: CheckoutCart,
): boolean {
  if (snapshot.items.length !== cart.items.length) {
    return false;
  }

  const snapshotMap = new Map(
    snapshot.items.map((item) => [
      item.mealId,
      { quantity: item.quantity, unitPrice: toNumber(item.unitPrice) },
    ]),
  );

  for (const cartItem of cart.items) {
    const snapshotItem = snapshotMap.get(cartItem.mealId);
    if (
      !snapshotItem ||
      snapshotItem.quantity !== cartItem.quantity ||
      snapshotItem.unitPrice !== toNumber(cartItem.unitPrice)
    ) {
      return false;
    }
  }

  return true;
}

// ============================================
// Public API — Checkout Entry Point
// ============================================

/**
 * Create a checkout session for a cart.
 *
 * Routes to the correct settlement handler:
 * - **MEAL_PLAN_CREDITS** → redeem credits, create orders, no Stripe involved.
 * - **STRIPE** → create (or resume) a Stripe Checkout Session.
 *
 * Stripe path has three sub-cases:
 * 1. Existing snapshot with a live Stripe session → return that session's URL.
 * 2. Existing snapshot but expired/failed Stripe session → create a new Stripe session from snapshot.
 * 3. No snapshot yet → fresh checkout: create intents, snapshot, and Stripe session.
 */
export async function createStripeCheckoutSessionForCart(
  input: { cartId: string } & CartCheckoutRequest,
) {
  const cart = await getCheckoutCart(input.cartId);

  if (!cart) {
    throw new Error(`Cart ${input.cartId} not found`);
  }

  if (!cart.items.length) {
    throw new Error("Cart is empty");
  }

  const deliveryMethod = input.deliveryMethod ?? "DELIVERY";
  const pickupLocation =
    deliveryMethod === "PICKUP" ? input.pickupLocation ?? undefined : undefined;

  // --- Settlement: Meal-Plan Credits ---
  if (cart.settlementMethod === "MEAL_PLAN_CREDITS") {
    return finalizeMealPlanCart(cart, input, deliveryMethod, pickupLocation);
  }

  if (cart.settlementMethod !== "STRIPE") {
    throw new Error(`Unsupported settlement method ${cart.settlementMethod}`);
  }

  // --- Settlement: Stripe ---

  // Case 1 & 2: Existing snapshot — reuse or retry
  const existingSnapshot = await getExistingCheckoutSnapshot(cart.id, input.requestId);
  if (existingSnapshot?.stripeSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      existingSnapshot.stripeSessionId,
    );

    if (existingSession.status === "complete") {
      throw new Error("Checkout already completed");
    }

    // Case 1: Still open — return directly if cart hasn't changed
    if (existingSession.status === "open" && existingSession.url) {
      if (snapshotMatchesCart(existingSnapshot, cart)) {
        return { id: existingSession.id, url: existingSession.url };
      }

      // Cart changed since the snapshot — expire stale Stripe session
      await stripe.checkout.sessions.expire(existingSnapshot.stripeSessionId!);
      await prisma.checkoutSession.update({
        where: { id: existingSnapshot.id },
        data: { 
          status: "EXPIRED",
          clientRequestId: `${existingSnapshot.clientRequestId}:expired:${Date.now()}`,
        },
      });

      // Vacate clientRequestId on old OrderIntents so new ones can be created
      // for the fresh snapshot without violating the 1-to-1 unique mapping constraint
      await prisma.orderIntent.updateMany({
        where: {
          id: { in: existingSnapshot.items.map((i) => i.orderIntentId) },
        },
        data: {
          status: "EXPIRED",
          clientRequestId: null,
        },
      });

      // Fall through to create a fresh checkout below
      return createFreshStripeSession(cart, input, deliveryMethod, pickupLocation);
    }

    // Case 2: Expired/failed — rebuild Stripe session from snapshot
  }

  if (existingSnapshot) {
    return createStripeSessionFromSnapshot(cart, existingSnapshot, deliveryMethod, pickupLocation);
  }

  // Case 3: Fresh checkout
  return createFreshStripeSession(cart, input, deliveryMethod, pickupLocation);
}

// ============================================
// Public API — Webhook Finalization
// ============================================

/**
 * Called by the Stripe `checkout.session.completed` webhook.
 *
 * Looks up the immutable checkout snapshot, then creates one `Order` per
 * snapshot item (skipping any that were already created by a prior delivery).
 */
export async function finalizeCartCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge", "line_items"],
  });

  if (session.payment_status !== "paid") {
    return [];
  }

  const snapshot = await loadCheckoutSnapshotForStripeSession(session);

  if (!snapshot) {
    throw new Error(`Checkout session snapshot not found for ${sessionId}`);
  }

  // --- Extract Stripe payment details ---
  const paymentIntent = session.payment_intent as Stripe.PaymentIntent | string | null;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  const latestCharge = typeof paymentIntent === "string" ? null : paymentIntent?.latest_charge;
  const stripeChargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  const stripeBalanceTransactionId =
    typeof latestCharge === "string"
      ? undefined
      : latestCharge?.balance_transaction?.toString();

  // --- Create orders (idempotent per orderIntentId) ---
  const existingOrders = await prisma.order.findMany({
    where: { stripeSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: orderService.orderInclude,
  });
  const existingOrderByIntentId = new Map(
    existingOrders
      .filter((order) => order.orderIntentId)
      .map((order) => [order.orderIntentId as string, order]),
  );

  const lineTotal = snapshot.items.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);
  const stripeTotalMajor =
    session.amount_total != null && session.amount_total > 0
      ? session.amount_total / 100
      : null;
  const orderGroupTotal = stripeTotalMajor ?? lineTotal;
  if (orderGroupTotal <= 0) {
    throw new Error(`Invalid checkout total for session ${sessionId}`);
  }
  const orderGroupCurrency =
    (typeof session.currency === "string" ? session.currency : null)?.toLowerCase() ??
    snapshot.items[0]?.currency?.toLowerCase() ??
    "cad";

  const baseOrderInputs = buildCreateOrderInputsFromCheckoutSnapshot(
    snapshot,
    session,
    paymentIntentId,
    stripeChargeId,
    stripeBalanceTransactionId,
  );

  await prisma.$transaction(async (tx) => {
    const orderGroup = await tx.orderGroup.upsert({
      where: { checkoutSessionId: snapshot.id },
      create: {
        checkoutSessionId: snapshot.id,
        totalAmount: orderGroupTotal,
        currency: orderGroupCurrency,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        stripeChargeId: stripeChargeId ?? null,
      },
      update: {
        totalAmount: orderGroupTotal,
        currency: orderGroupCurrency,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        stripeChargeId: stripeChargeId ?? null,
      },
    });

    for (let i = 0; i < snapshot.items.length; i++) {
      const item = snapshot.items[i]!;
      if (existingOrderByIntentId.has(item.orderIntentId)) {
        continue;
      }

      const base = baseOrderInputs[i];
      if (!base) continue;

      const orderInput: CreateOrderInput = {
        ...base,
        orderGroupId: orderGroup.id,
      };

      const order = await orderService.createOrder(orderInput, tx);
      existingOrderByIntentId.set(item.orderIntentId, order);
    }

    await tx.checkoutSession.update({
      where: { id: snapshot.id },
      data: {
        status: "PAID",
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? null,
        stripeChargeId,
        stripeBalanceTransactionId,
      },
    });

    await tx.orderIntent.updateMany({
      where: {
        id: { in: snapshot.items.map((item) => item.orderIntentId) },
      },
      data: {
        status: "PAID",
      },
    });

    await tx.cart.update({
      where: { id: snapshot.cartId },
      data: { status: "CHECKED_OUT" },
    });
  });

  return prisma.order.findMany({
    where: { stripeSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: orderService.orderInclude,
  });
}

// ============================================
// Public API — Status Updates (Webhook Lifecycle)
// ============================================

/**
 * Update checkout status when a Stripe session fails, expires, or is cancelled.
 * Re-activates the cart so the customer can try again.
 */
export async function updateCartCheckoutStatus(
  session: Stripe.Checkout.Session,
  status: "FAILED" | "EXPIRED" | "CANCELLED",
) {
  const checkoutSessionId = getCheckoutSessionIdFromSession(session);
  const snapshot = checkoutSessionId
    ? ((await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: checkoutSnapshotInclude,
      })) as CheckoutSnapshot | null)
    : await getCheckoutSnapshotByStripeSessionId(session.id);

  if (!snapshot) {
    return null;
  }

  await prisma.cart.update({
    where: { id: snapshot.cartId },
    data: { status: "ACTIVE" },
  });

  await prisma.checkoutSession.update({
    where: { id: snapshot.id },
    data: {
      status,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    },
  });

  return prisma.orderIntent.updateMany({
    where: {
      id: { in: snapshot.items.map((item) => item.orderIntentId) },
    },
    data: {
      status,
    },
  });
}

/**
 * Extract our internal `checkoutSessionId` from the Stripe session metadata.
 * Re-exported for use by webhook handlers.
 */
export function getCheckoutSessionIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  return getCheckoutSessionIdFromSession(session);
}
