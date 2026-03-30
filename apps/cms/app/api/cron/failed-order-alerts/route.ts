import { NextResponse } from "next/server";

import { failedOrderService } from "@/lib/services/failed-order.service";

/**
 * Retries ops webhook delivery for FailedOrder rows with no adminNotifiedAt.
 * Schedule with CRON_SECRET Bearer auth (same as other cron routes).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await failedOrderService.retryPendingAdminNotifications();
  return NextResponse.json({ ok: true, ...result });
}
