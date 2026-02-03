import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/stripe-service";
import Stripe from "stripe";
import { webhookRateLimiter } from "@/lib/rate-limit";
import { isEventProcessed, markEventProcessed } from "@/lib/webhook-dedup";

// ============================================
// Webhook Handler
// ============================================

export async function POST(request: NextRequest) {
  // Rate limiting for webhook endpoint (protection against non-Stripe abuse)
  const rateLimitResult = await webhookRateLimiter.check(request);
  if (!rateLimitResult.success) {
    console.warn("Webhook rate limit exceeded");
    return rateLimitResult.response;
  }

  console.log("🔔 Webhook received!");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // ============================================
  // Event Deduplication
  // ============================================

  // Check if this event was already processed (prevents duplicate processing)
  if (isEventProcessed(event.id)) {
    console.log(`🔄 Duplicate webhook event ${event.id}, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ============================================
  // Event Handling
  // ============================================

  switch (event.type) {
    // ==========================================
    // Payment Success Events
    // ==========================================
    case "checkout.session.completed": {
      const success = await handleCheckoutComplete(
        event.data.object as Stripe.Checkout.Session
      );

      // If order creation failed, return 500 so Stripe retries
      if (!success) {
        return NextResponse.json(
          { error: "Order creation failed, will retry" },
          { status: 500 }
        );
      }
      break;
    }

    // ==========================================
    // Payment Failure Events
    // ==========================================
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed for intent: ${paymentIntent.id}`);
      // Could notify customer or log for analytics
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`⏰ Checkout session expired: ${session.id}`);
      // Could clean up any reserved inventory or notify analytics
      break;
    }

    // ==========================================
    // Refund Events
    // ==========================================
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge);
      break;
    }

    case "charge.refund.updated": {
      const refund = event.data.object as Stripe.Refund;
      console.log(`🔄 Refund updated: ${refund.id}, status: ${refund.status}`);
      break;
    }

    // ==========================================
    // Dispute Events (IMPORTANT - respond quickly!)
    // ==========================================
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await handleDisputeCreated(dispute);
      break;
    }

    case "charge.dispute.updated": {
      const dispute = event.data.object as Stripe.Dispute;
      console.log(`📋 Dispute updated: ${dispute.id}, status: ${dispute.status}`);
      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      console.log(`✅ Dispute closed: ${dispute.id}, status: ${dispute.status}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Mark event as processed AFTER successful handling
  markEventProcessed(event.id);

  return NextResponse.json({ received: true });
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handles checkout.session.completed event.
 * Returns true if order was created successfully, false otherwise.
 */
/**
 * Handles checkout.session.completed event.
 * Uses the shared fulfillment logic (Triple-Check Layer 2).
 */
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  try {
    await fulfillOrder(session.id);
    return true;
  } catch (error) {
    console.error("Webhook fulfillment failed:", error);
    // Return false to let Stripe retry later
    return false;
  }
}

/**
 * Handle charge.refunded event.
 * Updates order status to CANCELLED when a refund is processed.
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  console.log(`💸 Charge refunded: ${charge.id}`);
  console.log(`   Amount refunded: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
  console.log(`   Full refund: ${charge.refunded}`);

  // Extract payment intent to find the related order
  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent?.id;

  if (paymentIntentId) {
    console.log(`   Payment Intent: ${paymentIntentId}`);
    // TODO: Update order status via CMS API
    // await cmsApi.orders.updateStatusByPaymentIntent(paymentIntentId, 'CANCELLED');
    console.log(`   ⚠️ Manual action required: Update order status to CANCELLED in CMS`);
  }

  // Log for admin notification
  console.log(`\n${"=".repeat(60)}`);
  console.log(`💸 REFUND PROCESSED`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Charge ID: ${charge.id}`);
  console.log(`Amount: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
  console.log(`Customer: ${charge.billing_details?.email || 'Unknown'}`);
  console.log(`${"=".repeat(60)}\n`);
}

/**
 * Handle charge.dispute.created event.
 * Disputes require immediate attention - you typically have 7-21 days to respond.
 */
async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  console.error(`\n${"!".repeat(60)}`);
  console.error(`🚨 URGENT: PAYMENT DISPUTE CREATED`);
  console.error(`${"!".repeat(60)}`);
  console.error(`Dispute ID: ${dispute.id}`);
  console.error(`Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`);
  console.error(`Reason: ${dispute.reason}`);
  console.error(`Status: ${dispute.status}`);
  console.error(`Evidence Due: ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : 'Unknown'}`);
  console.error(`Charge ID: ${dispute.charge}`);
  console.error(`\nACTION REQUIRED: Log into Stripe Dashboard to respond to this dispute.`);
  console.error(`${"!".repeat(60)}\n`);

  // In production, you would:
  // 1. Send email/SMS alert to admin
  // 2. Create a high-priority ticket
  // 3. Possibly freeze the related order
  // 4. Gather evidence (order details, delivery confirmation, etc.)
}
