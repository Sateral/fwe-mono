import { NextResponse } from "next/server";
import { failedOrderService } from "@/lib/services/failed-order.service";
import { z } from "zod";
import { requireInternalAuth } from "@/lib/api-auth";

// ============================================
// Validation Schemas
// ============================================

const createFailedOrderSchema = z.object({
  stripeSessionId: z.string().min(1),
  stripePaymentIntentId: z.string().optional(),
  customerEmail: z.string().optional(),
  customerName: z.string().optional(),
  orderData: z.object({
    userId: z.string(),
    mealId: z.string(),
    rotationId: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalAmount: z.number(),
    substitutions: z
      .array(
        z.object({
          groupName: z.string(),
          optionName: z.string(),
        })
      )
      .optional(),
    modifiers: z
      .array(
        z.object({
          groupName: z.string(),
          optionNames: z.array(z.string()),
        })
      )
      .optional(),
    proteinBoost: z.boolean().optional(),
    notes: z.string().optional(),
    stripeSessionId: z.string(),
    stripePaymentIntentId: z.string(),
  }),
  errorMessage: z.string(),
  errorCode: z.string().optional(),
});

// ============================================
// GET /api/failed-orders - List failed orders
// ============================================

/**
 * Get failed orders for admin dashboard.
 *
 * Query params:
 * - status: Filter by status (PENDING, RETRYING, RESOLVED, ABANDONED)
 */
export async function GET(request: Request) {
  // Require authentication for accessing failed orders
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "PENDING"
      | "RETRYING"
      | "RESOLVED"
      | "ABANDONED"
      | null;

    console.log(`[API] GET /api/failed-orders (status: ${status || "all"})`);

    const failedOrders = await failedOrderService.getAllFailedOrders(
      status || undefined
    );

    // Also include pending count for alerts
    const pendingCount = await failedOrderService.getPendingCount();

    return NextResponse.json({
      failedOrders,
      pendingCount,
    });
  } catch (error) {
    console.error("[API] Failed to fetch failed orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch failed orders" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/failed-orders - Create failed order
// ============================================

/**
 * Record a failed order attempt.
 * Called by the commerce app when order creation fails.
 */
export async function POST(request: Request) {
  // Require authentication for creating failed orders
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    console.log(`[API] POST /api/failed-orders`);

    const body = await request.json();
    const parsed = createFailedOrderSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        "[API] Failed order validation failed:",
        parsed.error.flatten()
      );
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const failedOrder = await failedOrderService.createFailedOrder(parsed.data);

    // Log admin alert
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚨 ADMIN ALERT: Payment received but order creation FAILED`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Stripe Session: ${parsed.data.stripeSessionId}`);
    console.log(
      `Customer: ${parsed.data.customerName || "Unknown"} (${
        parsed.data.customerEmail || "No email"
      })`
    );
    console.log(`Error: ${parsed.data.errorMessage}`);
    console.log(`Failed Order ID: ${failedOrder.id}`);
    console.log(`Action Required: Review in CMS Dashboard → Failed Orders`);
    console.log(`${"=".repeat(60)}\n`);

    return NextResponse.json(failedOrder, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create failed order:", error);
    return NextResponse.json(
      { error: "Failed to record failed order" },
      { status: 500 }
    );
  }
}
