import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { requireInternalAuth } from "@/lib/api-auth";

/**
 * POST /api/orders/fix-rotation
 * 
 * Fixes orders that were assigned to the wrong rotation.
 * 
 * Logic: An order placed on date X should belong to the rotation
 * whose orderCutoff is >= X (and is the earliest such rotation).
 */
export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    console.log("[FixOrders] Fetching all orders and rotations...");
    
    const [orders, rotations] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          rotation: true,
        },
      }),
      prisma.weeklyRotation.findMany({
        orderBy: { weekStart: "asc" },
      }),
    ]);
    
    console.log(`[FixOrders] Found ${orders.length} orders and ${rotations.length} rotations.`);
    
    const results = [];
    let fixedCount = 0;
    
    for (const order of orders) {
      const orderDate = new Date(order.createdAt);
      
      // Find the correct rotation for this order:
      // The rotation where orderCutoff >= orderDate (ordering was still open)
      // Pick the earliest one (smallest weekStart)
      const correctRotation = rotations.find(r => 
        new Date(r.orderCutoff) >= orderDate
      );
      
      if (!correctRotation) {
        results.push({
          orderId: order.id,
          orderDate: orderDate.toISOString(),
          currentRotationId: order.rotationId,
          issue: "No valid rotation found for order date",
          fixed: false,
        });
        continue;
      }
      
      const needsFix = order.rotationId !== correctRotation.id;
      
      const result = {
        orderId: order.id,
        orderDate: format(orderDate, "MMM d, yyyy h:mm a"),
        currentRotation: {
          id: order.rotationId,
          weekStart: format(new Date(order.rotation.weekStart), "MMM d"),
          weekEnd: format(new Date(order.rotation.weekEnd), "MMM d"),
        },
        correctRotation: {
          id: correctRotation.id,
          weekStart: format(new Date(correctRotation.weekStart), "MMM d"),
          weekEnd: format(new Date(correctRotation.weekEnd), "MMM d"),
        },
        fixed: false,
      };
      
      if (needsFix) {
        await prisma.order.update({
          where: { id: order.id },
          data: { rotationId: correctRotation.id },
        });
        result.fixed = true;
        fixedCount++;
        console.log(`[FixOrders] Fixed order ${order.id}: ${order.rotation.weekStart} -> ${correctRotation.weekStart}`);
      }
      
      results.push(result);
    }
    
    console.log(`[FixOrders] Done! Fixed ${fixedCount} order(s).`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} of ${orders.length} orders`,
      results,
    });
  } catch (error) {
    console.error("[FixOrders] Error:", error);
    return NextResponse.json(
      { error: "Failed to fix orders", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser access
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

