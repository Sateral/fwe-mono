import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { formatBusinessTime } from "@/lib/services/rotation-schedule";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

/**
 * GET /api/rotation/active
 *
 * Returns the rotation that orders should be grouped into under the
 * Thursday 3pm Toronto schedule.
 *
 * Fulfillment cycles are Thu 00:00 - Wed 23:59 Toronto. Ordering for a cycle
 * runs from the prior Thu 3pm through that cycle's Thu 2:59pm (n+1 grouping).
 * Missing `WeeklyRotation` rows are created as DRAFT.
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

    const weekStartDate = new Date(deliveryWeekStart);
    const weekEndDate = new Date(deliveryWeekEnd);

    const response = {
      id: rotation.id,
      weekStart: weekStartDate.toISOString(),
      weekEnd: weekEndDate.toISOString(),
      orderCutoff: orderCutoff.toISOString(),
      deliveryWeekDisplay: `${formatBusinessTime(weekStartDate, "MMM d")} - ${formatBusinessTime(weekEndDate, "MMM d")}`,
      cutoffDisplay: formatBusinessTime(orderCutoff, "EEE, MMM d 'at' h:mm a"),
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
