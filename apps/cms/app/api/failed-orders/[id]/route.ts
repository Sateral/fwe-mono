import { NextResponse } from "next/server";
import { failedOrderService } from "@/lib/services/failed-order.service";
import { z } from "zod";
import { requireInternalAuth } from "@/lib/api-auth";

// ============================================
// GET /api/failed-orders/[id] - Get single failed order
// ============================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    console.log(`[API] GET /api/failed-orders/${id}`);

    const failedOrder = await failedOrderService.getFailedOrderById(id);

    if (!failedOrder) {
      return NextResponse.json(
        { error: "Failed order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(failedOrder);
  } catch (error) {
    console.error("[API] Failed to fetch failed order:", error);
    return NextResponse.json(
      { error: "Failed to fetch failed order" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/failed-orders/[id] - Retry or abandon
// ============================================

const actionSchema = z.object({
  action: z.enum(["retry", "abandon"]),
  adminUserId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication for retry/abandon actions
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    console.log(
      `[API] POST /api/failed-orders/${id} - Action: ${parsed.data.action}`
    );

    if (parsed.data.action === "retry") {
      const order = await failedOrderService.retryFailedOrder(
        id,
        parsed.data.adminUserId
      );

      console.log(`✅ Order ${order.id} recovered successfully!`);

      return NextResponse.json({
        success: true,
        message: "Order recovered successfully",
        order,
      });
    } else if (parsed.data.action === "abandon") {
      const failedOrder = await failedOrderService.abandonFailedOrder(
        id,
        parsed.data.adminUserId
      );

      console.log(`⚠️ Failed order ${id} marked as abandoned`);

      return NextResponse.json({
        success: true,
        message: "Failed order marked as abandoned",
        failedOrder,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Failed order action failed:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
