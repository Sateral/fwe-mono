import type Stripe from "stripe";
import type { CreateOrderInput } from "@fwe/validators";

import prisma from "./prisma";
import { stripe } from "./stripe";
import { orderService } from "./services/order.service";

export function getOrderIntentIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  return session.metadata?.orderIntentId || session.client_reference_id || null;
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

export async function ensureOrderFromSession(sessionId: string) {
  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: orderService.orderInclude,
  });

  if (existing) {
    return existing;
  }

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
    unitPrice: orderIntent.unitPrice,
    totalAmount: orderIntent.totalAmount,
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
    stripePaymentIntentId: paymentIntentId ?? session.id,
    stripeChargeId: chargeId,
    stripeBalanceTransactionId: balanceTransactionId,
  };

  const order = await orderService.createOrder(orderInput);

  await prisma.orderIntent.update({
    where: { id: orderIntent.id },
    data: {
      status: "PAID",
      stripeSessionId: session.id,
      stripePaymentIntentId:
        paymentIntentId ?? orderIntent.stripePaymentIntentId,
    },
  });

  return order;
}

export async function updateOrderIntentStatus(
  session: Stripe.Checkout.Session,
  status: "FAILED" | "EXPIRED" | "CANCELLED",
) {
  const orderIntentId = getOrderIntentIdFromSession(session);
  if (!orderIntentId) return null;

  return prisma.orderIntent.update({
    where: { id: orderIntentId },
    data: {
      status,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    },
  });
}
