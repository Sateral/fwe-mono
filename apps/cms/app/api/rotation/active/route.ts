import { NextResponse } from "next/server";
import { format } from "date-fns";

import { requireInternalAuth } from "@/lib/api-auth";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

/**
 * GET /api/rotation/active
 *
 * Returns the rotation that orders should be grouped into (next delivery week).
 *
 * WORKFLOW:
 * - Week runs Wednesday to Tuesday
 * - Orders placed in Week N are for delivery in Week N+1
 * - If the rotation record doesn't exist yet, it is created as DRAFT
 *
 * This is used by:
 * - Checkout flow to lock in which rotation an order belongs to
 */
export async function GET(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { rotation, deliveryWeekStart, deliveryWeekEnd, orderCutoff } =
      await weeklyRotationService.getOrCreateOrderingRotation();

    // Format for display
    const weekStartDate = new Date(deliveryWeekStart);
    const weekEndDate = new Date(deliveryWeekEnd);

    const response = {
      id: rotation.id,
      weekStart: weekStartDate.toISOString(),
      weekEnd: weekEndDate.toISOString(),
      orderCutoff: orderCutoff.toISOString(),
      // Formatted display strings
      deliveryWeekDisplay: `${format(weekStartDate, "MMM d")} - ${format(weekEndDate, "MMM d")}`,
      cutoffDisplay: format(orderCutoff, "EEE, MMM d 'at' h:mm a"),
    };

    console.log(
      `[API/rotation/active] Returning rotation ${rotation.id} for delivery week ${response.deliveryWeekDisplay}`,
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch active rotation:", error);
    return NextResponse.json(
      { error: "Failed to fetch active rotation" },
      { status: 500 },
    );
  }
}
