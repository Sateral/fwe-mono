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

const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

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
    },
  },
};

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
    substitutions: unknown;
    modifiers: unknown;
    proteinBoost: boolean;
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

type CheckoutSnapshot = {
  id: string;
  cartId: string;
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
    substitutions: unknown;
    modifiers: unknown;
    proteinBoost: boolean;
    notes: string | null;
    deliveryMethod: "DELIVERY" | "PICKUP";
    pickupLocation: string | null;
  }>;
};

type CheckoutSnapshotItem = CheckoutSnapshot["items"][number];

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : new Prisma.Decimal(value).toNumber();
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

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

async function getCheckoutCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: checkoutCartInclude,
  }) as Promise<CheckoutCart | null>;
}

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
            substitutions: item.substitutions as object[] | undefined,
            modifiers: item.modifiers as object[] | undefined,
            orderIntentId: orderIntents[index]!.id,
            proteinBoost: item.proteinBoost,
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
    return existing;
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
        substitutions: item.substitutions as object[] | undefined,
        modifiers: item.modifiers as object[] | undefined,
        proteinBoost: item.proteinBoost,
        notes: item.notes,
        deliveryMethod,
        pickupLocation: deliveryMethod === "PICKUP" ? pickupLocation : undefined,
        status: "CREATED",
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

function buildLineItem(
  item: CheckoutCartItem,
  deliveryMethod: "DELIVERY" | "PICKUP",
  pickupLocation?: string,
) {
  const substitutions = (item.substitutions ?? []) as CreateOrderInput["substitutions"];
  const modifiers = (item.modifiers ?? []) as CreateOrderInput["modifiers"];

  const description = formatLineItemDescription(
    item.meal,
    substitutions,
    modifiers,
    item.proteinBoost,
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

function buildLineItemFromSnapshot(
  item: CheckoutSnapshotItem,
) {
  return buildLineItem(
    {
      id: item.id,
      mealId: item.mealId,
      rotationId: item.rotationId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      substitutions: item.substitutions,
      modifiers: item.modifiers,
      proteinBoost: item.proteinBoost,
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
    include: {
      items: true,
    },
  }) as Promise<CheckoutSnapshot | null>;
}

async function getCheckoutSnapshotByStripeSessionId(stripeSessionId: string) {
  return prisma.checkoutSession.findUnique({
    where: { stripeSessionId },
    include: { items: true },
  }) as Promise<CheckoutSnapshot | null>;
}

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

  if (cart.settlementMethod === "MEAL_PLAN_CREDITS") {
    return finalizeMealPlanCart(cart, input, deliveryMethod, pickupLocation);
  }

  if (cart.settlementMethod !== "STRIPE") {
    throw new Error(`Unsupported settlement method ${cart.settlementMethod}`);
  }

  const existingSnapshot = await getExistingCheckoutSnapshot(cart.id, input.requestId);
  if (existingSnapshot?.stripeSessionId) {
    const existingSession = await stripe.checkout.sessions.retrieve(
      existingSnapshot.stripeSessionId,
    );

    if (existingSession.status === "complete") {
      throw new Error("Checkout already completed");
    }

    if (existingSession.status === "open" && existingSession.url) {
      return { id: existingSession.id, url: existingSession.url };
    }
  }

  if (existingSnapshot) {
    const substitutionsSummary = formatSubstitutionsSummary(
      existingSnapshot.items
        .flatMap(
          (item) =>
            ((item.substitutions as CreateOrderInput["substitutions"]) ?? []),
        )
        .slice(0, 10),
    ).slice(0, 200);
    const modifiersSummary = formatModifiersSummary(
      existingSnapshot.items
        .flatMap(
          (item) => ((item.modifiers as CreateOrderInput["modifiers"]) ?? []),
        )
        .slice(0, 10),
    ).slice(0, 200);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: existingSnapshot.customerEmail,
        currency: "cad",
        client_reference_id: cart.id,
        line_items: existingSnapshot.items.map((item) =>
          buildLineItemFromSnapshot(item),
        ),
        metadata: {
          cartId: cart.id,
          checkoutSessionId: existingSnapshot.id,
          userId: cart.userId,
          userName: existingSnapshot.customerName ?? "",
          itemCount: existingSnapshot.items.length.toString(),
          substitutionsSummary,
          modifiersSummary,
          deliveryMethod: existingSnapshot.deliveryMethod,
          pickupLocation: existingSnapshot.pickupLocation ?? "",
        },
        success_url: `${WEB_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${WEB_BASE_URL}/cart`,
      },
      {
        idempotencyKey: `${existingSnapshot.id}:retry:${existingSnapshot.stripeSessionId ?? "unknown"}`,
      },
    );

    await prisma.checkoutSession.update({
      where: { id: existingSnapshot.id },
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
        id: { in: existingSnapshot.items.map((item) => item.orderIntentId) },
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

  const checkoutClientRequestId = getCheckoutSessionClientRequestId(
    cart.id,
    input.requestId,
  );

  let snapshot: CheckoutSnapshot | null = existingSnapshot;

  if (!snapshot) {
    try {
      snapshot = await prisma.checkoutSession.create({
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
              substitutions: item.substitutions as object[] | undefined,
              modifiers: item.modifiers as object[] | undefined,
              proteinBoost: item.proteinBoost,
              notes: item.notes,
              deliveryMethod,
              pickupLocation,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        snapshot = await getExistingCheckoutSnapshot(cart.id, input.requestId);
      } else {
        throw error;
      }
    }
  }

  if (!snapshot) {
    throw new Error(`Checkout snapshot could not be created for cart ${cart.id}`);
  }

  const substitutionsSummary = formatSubstitutionsSummary(
    cart.items
      .flatMap((item) =>
        ((item.substitutions as CreateOrderInput["substitutions"]) ?? []),
      )
      .slice(0, 10),
  ).slice(0, 200);
  const modifiersSummary = formatModifiersSummary(
    cart.items
      .flatMap((item) => ((item.modifiers as CreateOrderInput["modifiers"]) ?? []))
      .slice(0, 10),
  ).slice(0, 200);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.userEmail,
      currency: "cad",
      client_reference_id: cart.id,
      line_items: cart.items.map((item) =>
        buildLineItem(item, deliveryMethod, pickupLocation),
      ),
      metadata: {
        cartId: cart.id,
        checkoutSessionId: snapshot.id,
        userId: cart.userId,
        userName: input.userName ?? "",
        itemCount: cart.items.length.toString(),
        substitutionsSummary,
        modifiersSummary,
        deliveryMethod,
        pickupLocation: pickupLocation ?? "",
      },
      success_url: `${WEB_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WEB_BASE_URL}/cart`,
    },
    {
      idempotencyKey: snapshot.id,
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

export async function finalizeCartCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge", "line_items"],
  });

  if (session.payment_status !== "paid") {
    return [];
  }

  const checkoutSessionId = getCheckoutSessionIdFromSession(session);
  const snapshot = checkoutSessionId
    ? ((await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { items: true },
      })) as CheckoutSnapshot | null)
    : await getCheckoutSnapshotByStripeSessionId(session.id);

  if (!snapshot) {
    throw new Error(`Checkout session snapshot not found for ${sessionId}`);
  }

  const paymentIntent = session.payment_intent as Stripe.PaymentIntent | string | null;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  const latestCharge = typeof paymentIntent === "string" ? null : paymentIntent?.latest_charge;
  const stripeChargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  const stripeBalanceTransactionId =
    typeof latestCharge === "string"
      ? undefined
      : latestCharge?.balance_transaction?.toString();

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

  for (const item of snapshot.items) {
    if (existingOrderByIntentId.has(item.orderIntentId)) {
      continue;
    }

    const orderInput: CreateOrderInput = {
      userId: snapshot.userId,
      mealId: item.mealId,
      rotationId: item.rotationId,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      totalAmount: toNumber(item.totalAmount),
      currency: item.currency,
      orderIntentId: item.orderIntentId,
      substitutions: (item.substitutions ?? undefined) as CreateOrderInput["substitutions"],
      modifiers: (item.modifiers ?? undefined) as CreateOrderInput["modifiers"],
      proteinBoost: item.proteinBoost,
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

    const order = await orderService.createOrder(orderInput);
    existingOrderByIntentId.set(item.orderIntentId, order);
  }

  await prisma.checkoutSession.update({
    where: { id: snapshot.id },
    data: {
      status: "PAID",
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? null,
      stripeChargeId,
      stripeBalanceTransactionId,
    },
  });

  await prisma.orderIntent.updateMany({
    where: {
      id: { in: snapshot.items.map((item) => item.orderIntentId) },
    },
    data: {
      status: "PAID",
    },
  });

  await prisma.cart.update({
    where: { id: snapshot.cartId },
    data: { status: "CHECKED_OUT" },
  });

  return prisma.order.findMany({
    where: { stripeSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: orderService.orderInclude,
  });
}

export async function updateCartCheckoutStatus(
  session: Stripe.Checkout.Session,
  status: "FAILED" | "EXPIRED" | "CANCELLED",
) {
  const checkoutSessionId = getCheckoutSessionIdFromSession(session);
  const snapshot = checkoutSessionId
    ? ((await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { items: true },
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

export function getCheckoutSessionIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  return getCheckoutSessionIdFromSession(session);
}
