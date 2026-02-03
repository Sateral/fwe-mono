import { NextResponse } from "next/server";
import { orderService } from "@/lib/services/order.service";
import { requireInternalAuth } from "@/lib/api-auth";

// ============================================
// GET /api/orders/stripe-session/[sessionId]
// ============================================

/**
 * Retrieve an order by its Stripe checkout session ID.
 * Used by the commerce app's success page to display order confirmation.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { sessionId } = await params;
    console.log(`[API] GET /api/orders/stripe-session/${sessionId}`);

    const order = await orderService.getOrderByStripeSessionId(sessionId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[API] Failed to fetch order by Stripe session:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
