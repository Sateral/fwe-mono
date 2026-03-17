import { Prisma } from "@fwe/db";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  ensureOrderFromSession,
  ensureOrdersFromSession,
  getOrderIntentIdFromSession,
  updateOrderIntentStatus,
} from "@/lib/stripe-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[StripeWebhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[StripeWebhook] Signature verification failed", error);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existingEvent?.processedAt) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const paymentEvent = await prisma.paymentEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      payload: event as unknown as Prisma.InputJsonValue,
    },
    update: {
      eventType: event.type,
      livemode: event.livemode,
      payload: event as unknown as Prisma.InputJsonValue,
    },
  });

  let orderId: string | null = null;
  let orderIntentId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        orderIntentId = getOrderIntentIdFromSession(session);
        if (session.payment_status === "paid") {
          const orders = await ensureOrdersFromSession(session.id);
          orderId = orders[0]?.id ?? null;
          if (orders[0]?.orderIntentId) {
            orderIntentId = orders[0].orderIntentId;
          }
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        orderIntentId = getOrderIntentIdFromSession(session);
        const orders = await ensureOrdersFromSession(session.id);
        orderId = orders[0]?.id ?? null;
        if (orders[0]?.orderIntentId) {
          orderIntentId = orders[0].orderIntentId;
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const updatedIntent = await updateOrderIntentStatus(session, "FAILED");
        orderIntentId =
          updatedIntent?.id ?? getOrderIntentIdFromSession(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const updatedIntent = await updateOrderIntentStatus(session, "EXPIRED");
        orderIntentId =
          updatedIntent?.id ?? getOrderIntentIdFromSession(session);
        break;
      }
      default:
        break;
    }

    await prisma.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: {
        processedAt: new Date(),
        orderId,
        orderIntentId,
        errorMessage: null,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[StripeWebhook] Processing failed", error);

    await prisma.paymentEvent.update({
      where: { id: paymentEvent.id },
      data: {
        errorMessage: message,
      },
    });

    return NextResponse.json(
      { error: "Webhook handling failed" },
      { status: 500 },
    );
  }
}
