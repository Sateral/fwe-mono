import { createOrderSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeOrder, serializeOrders } from "@/lib/api-serializers";
import { orderService } from "@/lib/services/order.service";

// ============================================
// GET /api/orders - List orders
// ============================================

/**
 * Get orders, optionally filtered by userId.
 *
 * Query params:
 * - userId: Filter orders for a specific user
 *
 * Without userId, returns all orders (for CMS dashboard).
 */
export async function GET(request: Request) {
  // Require authentication for order access
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let orders;
    if (userId) {
      console.log(`[API] GET /api/orders?userId=${userId}`);
      orders = await orderService.getUserOrders(userId);
    } else {
      console.log(`[API] GET /api/orders (all)`);
      orders = await orderService.getAllOrders();
    }

    return NextResponse.json(serializeOrders(orders));
  } catch (error) {
    console.error("[API] Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// ============================================
// POST /api/orders - Create order
// ============================================

/**
 * Create a new order.
 * Called by the commerce app's Stripe webhook after payment success.
 */
export async function POST(request: Request) {
  // Require authentication for order creation
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    console.log(`[API] POST /api/orders`);

    const body = await request.json();

    // Validate request body
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[API] Order validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const order = await orderService.createOrder(parsed.data);

    console.log(`[API] Order ${order.id} created successfully`);
    return NextResponse.json(serializeOrder(order), { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
