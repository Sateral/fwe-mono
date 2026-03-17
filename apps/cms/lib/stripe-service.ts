import type Stripe from "stripe";
import type { CreateOrderInput } from "@fwe/validators";
import { Prisma } from "@fwe/db";

import prisma from "./prisma";
import { stripe } from "./stripe";
import {
  finalizeCartCheckoutSession,
  getCheckoutSessionIdFromCheckoutSession,
  updateCartCheckoutStatus,
} from "./services/cart-checkout.service";
import { orderService } from "./services/order.service";

export function getOrderIntentIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  return session.metadata?.orderIntentId || null;
}

export function extractPaymentIntentIds(
  paymentIntent: Stripe.PaymentIntent | string | null | undefined,
) {
  if (!paymentIntent)
    return {
      paymentIntentId: undefined,
      chargeId: undefined,
      balanceTransactionId: undefined,
    };

  if (typeof paymentIntent === "string") {
    return {
      paymentIntentId: paymentIntent,
      chargeId: undefined,
      balanceTransactionId: undefined,
    };
  }

  const latestCharge = paymentIntent.latest_charge;
  const chargeId =
    typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  const balanceTransactionId =
    typeof latestCharge !== "string"
      ? latestCharge?.balance_transaction?.toString()
      : undefined;

  return {
    paymentIntentId: paymentIntent.id,
    chargeId,
    balanceTransactionId,
  };
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : new Prisma.Decimal(value).toNumber();
}

export async function ensureOrderFromSession(sessionId: string) {
  const existing = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: orderService.orderInclude,
  });

  if (existing) {
    return existing;
  }

  try {
    const createdOrders = await finalizeCartCheckoutSession(sessionId);
    return createdOrders[0] ?? null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `Checkout session snapshot not found for ${sessionId}`
    ) {
      return ensureLegacyOrderFromSession(sessionId);
    }

    throw error;
  }
}

export async function ensureOrdersFromSession(sessionId: string) {
  const existing = await prisma.order.findMany({
    where: { stripeSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: orderService.orderInclude,
  });

  if (existing.length > 0) {
    return existing;
  }

  try {
    return await finalizeCartCheckoutSession(sessionId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === `Checkout session snapshot not found for ${sessionId}`
    ) {
      const order = await ensureLegacyOrderFromSession(sessionId);
      return order ? [order] : [];
    }

    throw error;
  }
}

async function ensureLegacyOrderFromSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge"],
  });

  if (session.payment_status !== "paid") {
    return null;
  }

  const orderIntentId = getOrderIntentIdFromSession(session);
  if (!orderIntentId) {
    throw new Error(`Missing orderIntentId for session ${sessionId}`);
  }

  const orderIntent = await prisma.orderIntent.findUnique({
    where: { id: orderIntentId },
  });

  if (!orderIntent) {
    throw new Error(`OrderIntent ${orderIntentId} not found`);
  }

  const { paymentIntentId, chargeId, balanceTransactionId } =
    extractPaymentIntentIds(
      session.payment_intent as Stripe.PaymentIntent | string | null,
    );

  const orderInput: CreateOrderInput = {
    userId: orderIntent.userId,
    mealId: orderIntent.mealId,
    rotationId: orderIntent.rotationId,
    quantity: orderIntent.quantity,
    unitPrice: toNumber(orderIntent.unitPrice),
    totalAmount: toNumber(orderIntent.totalAmount),
    currency: orderIntent.currency,
    orderIntentId: orderIntent.id,
    substitutions: (orderIntent.substitutions ??
      undefined) as unknown as CreateOrderInput["substitutions"],
    modifiers: (orderIntent.modifiers ??
      undefined) as unknown as CreateOrderInput["modifiers"],
    proteinBoost: orderIntent.proteinBoost,
    notes: orderIntent.notes ?? undefined,
    deliveryMethod: orderIntent.deliveryMethod,
    pickupLocation: orderIntent.pickupLocation ?? undefined,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId ?? undefined,
    stripeChargeId: chargeId,
    stripeBalanceTransactionId: balanceTransactionId,
  };

  const order = await orderService.createOrder(orderInput);

  await prisma.orderIntent.update({
    where: { id: orderIntent.id },
    data: {
      status: "PAID",
    },
  });

  return order;
}

export async function updateOrderIntentStatus(
  session: Stripe.Checkout.Session,
  status: "FAILED" | "EXPIRED" | "CANCELLED",
) {
  const checkoutSessionId = getCheckoutSessionIdFromCheckoutSession(session);
  const checkoutSession = checkoutSessionId
    ? await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { items: true },
      })
    : await prisma.checkoutSession.findUnique({
        where: { stripeSessionId: session.id },
        include: { items: true },
      });

  if (checkoutSession) {
    await updateCartCheckoutStatus(session, status);

    const firstOrderIntentId = checkoutSession?.items[0]?.orderIntentId;
    return firstOrderIntentId
      ? prisma.orderIntent.findUnique({ where: { id: firstOrderIntentId } })
      : null;
  }

  const orderIntentId = getOrderIntentIdFromSession(session);
  if (!orderIntentId) return null;

  return prisma.orderIntent.update({
    where: { id: orderIntentId },
    data: {
      status,
    },
  });
}
