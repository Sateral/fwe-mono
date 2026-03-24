import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serializers";
import { ensureOrdersFromSession } from "@/lib/stripe-service";
import { orderService } from "@/lib/services/order.service";

// ============================================
// GET /api/orders/stripe-session/[sessionId]
// ============================================

/**
 * Retrieve an order by its Stripe checkout session ID.
 * Used by the commerce app's success page to display order confirmation.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await params;
    console.log(`[API] GET /api/orders/stripe-session/${sessionId}`);

    const orders = await orderService.getOrdersByStripeSessionId(sessionId);

    if (!orders.length) {
      return NextResponse.json({ error: "Orders not found" }, { status: 404 });
    }

    return NextResponse.json({
      sessionId,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error("[API] Failed to fetch order by Stripe session:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

// ============================================
// POST /api/orders/stripe-session/[sessionId]
// ============================================

/**
 * Ensure an order exists for a Stripe checkout session.
 * Used by the web success page as a best-effort sync.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await params;
    console.log(`[API] POST /api/orders/stripe-session/${sessionId}`);

    const orders = await ensureOrdersFromSession(sessionId);

    if (!orders.length) {
      return NextResponse.json(null, { status: 202 });
    }

    return NextResponse.json({
      sessionId,
      orders: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error("[API] Failed to ensure order:", error);
    return NextResponse.json(
      { error: "Failed to ensure order" },
      { status: 500 },
    );
  }
}
