import { updateFulfillmentStatusSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serializers";
import { orderService } from "@/lib/services/order.service";

// ============================================
// GET /api/orders/[id] - Get single order
// ============================================

/**
 * Retrieve a single order by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    console.log(`[API] GET /api/orders/${id}`);

    const order = await orderService.getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(serializeOrder(order));
  } catch (error) {
    console.error("[API] Failed to fetch order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

// ============================================
// PATCH /api/orders/[id] - Update fulfillment status
// ============================================

/**
 * Update an order's fulfillment status.
 * Used by CMS dashboard for order management.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    console.log(`[API] PATCH /api/orders/${id}`);

    const body = await request.json();

    // Validate request body
    const parsed = updateFulfillmentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const order = await orderService.updateFulfillmentStatus(
      id,
      parsed.data.fulfillmentStatus,
    );

    console.log(
      `[API] Order ${id} updated to fulfillment status ${parsed.data.fulfillmentStatus}`,
    );
    return NextResponse.json(serializeOrder(order));
  } catch (error) {
    console.error("[API] Failed to update order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}
