import { stripe } from "@/lib/stripe";
import { cmsApi } from "@/lib/cms-api";
import { failedOrdersApi } from "@/lib/cms-api";
import type { CreateOrderInput } from "@/lib/cms-api";

/**
 * Ensures an order exists for a given Stripe Session ID.
 * This is the core "Triple-Check" logic used by:
 * 1. Success Page (Layer 1)
 * 2. Webhook (Layer 2)
 * 3. Reconciliation Cron (Layer 3)
 *
 * @returns The created or existing Order object
 */
export async function fulfillOrder(sessionId: string) {
  console.log(`[StripeService] Fulfilling order for session: ${sessionId}`);

  // 1. Check if order already exists (Idempotency)
  const existingOrder = await cmsApi.orders.getByStripeSession(sessionId);
  if (existingOrder) {
    console.log(`[StripeService] Order already exists: ${existingOrder.id}`);
    return existingOrder;
  }

  // 2. Fetch Session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // 3. Verify Payment Status
  if (session.payment_status !== "paid") {
    console.log(
      `[StripeService] Session ${sessionId} not paid. Status: ${session.payment_status}`
    );
    return null; // Not an error, just not ready
  }

  const metadata = session.metadata;
  if (!metadata?.userId || !metadata?.mealId) {
    throw new Error(`Missing metadata in session ${sessionId}`);
  }

  // 3a. Verify Payment Amount (Security: ensure amount matches expected)
  const expectedAmountCents = Math.round(
    parseFloat(metadata.totalAmount || "0") * 100
  );
  const actualAmountCents = session.amount_total || 0;

  // Allow small rounding differences (up to 1 cent)
  if (Math.abs(actualAmountCents - expectedAmountCents) > 1) {
    console.error(
      `[StripeService] SECURITY: Amount mismatch for session ${sessionId}!`,
      `Expected: ${expectedAmountCents} cents, Got: ${actualAmountCents} cents`
    );
    throw new Error(
      `Payment amount mismatch: expected ${expectedAmountCents}, got ${actualAmountCents}`
    );
  }

  // 4. Parse Complex Data
  let substitutions;
  if (metadata.substitutions) {
    try {
      substitutions = JSON.parse(metadata.substitutions);
    } catch (e) {
      console.warn("Failed to parse substitutions", e);
    }
  }

  let modifiers;
  if (metadata.modifiers) {
    try {
      modifiers = JSON.parse(metadata.modifiers);
    } catch (e) {
      console.warn("Failed to parse modifiers", e);
    }
  }

  // Get rotationId from metadata (locked in at checkout time)
  // Fall back to fetching active rotation if not present (legacy orders)
  let rotationId = metadata.rotationId;
  
  if (!rotationId) {
    console.log(`[StripeService] No rotationId in metadata, fetching active rotation (legacy order)`);
    const activeRotation = await cmsApi.meals.getActiveRotation();
    if (!activeRotation) {
      throw new Error(
        "No active rotation found for order fulfillment. Order might be outside valid window."
      );
    }
    rotationId = activeRotation.id;
  }

  // Construct order data with locked-in rotation
  const finalOrderData: CreateOrderInput = {
    userId: metadata.userId,
    mealId: metadata.mealId,
    rotationId,
    quantity: parseInt(metadata.quantity || "1", 10),
    unitPrice: parseFloat(metadata.unitPrice || "0"),
    totalAmount: session.amount_total
      ? session.amount_total / 100
      : parseFloat(metadata.totalAmount || "0"),
    substitutions,
    modifiers,
    proteinBoost: metadata.proteinBoost === "true",
    notes: metadata.notes || undefined,
    deliveryMethod:
      metadata.deliveryMethod === "PICKUP" ? "PICKUP" : "DELIVERY",
    pickupLocation: metadata.pickupLocation || undefined,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
  };

  try {
    // 5. Create Order
    const order = await cmsApi.orders.create(finalOrderData);
    console.log(`[StripeService] Successfully created order ${order.id} for rotation ${rotationId}`);
    return order;
  } catch (error) {
    // If creation fails, save to DLQ for recovery
    console.error(`[StripeService] Failed to create order:`, error);

    try {
      await failedOrdersApi.create({
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        customerEmail: session.customer_email || metadata.userName,
        customerName: metadata.userName,
        orderData: finalOrderData,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorCode: "FULFILLMENT_FAILED",
      });
      console.log(`[StripeService] Saved to DLQ`);
    } catch (dlqError) {
      console.error(
        `[StripeService] CRITICAL: Failed to save to DLQ`,
        dlqError
      );
    }

    throw error; // Re-throw so caller knows it failed
  }
}
