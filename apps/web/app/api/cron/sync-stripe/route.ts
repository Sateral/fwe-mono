import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/stripe-service";

export const dynamic = "force-dynamic";

/**
 * Layer 3: Reconciliation Cron Job
 * Fetches recent paid sessions from Stripe and ensures they exist in the DB.
 * This covers scenarios where BOTH the success page and webhook failed.
 *
 * Secure this endpoint with a secret header (e.g. CRON_SECRET).
 */
export async function GET(request: NextRequest) {
  // Security check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch sessions from the last 24 hours
    const oneDayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

    const sessions = await stripe.checkout.sessions.list({
      limit: 100, // Adjust as needed
      created: { gte: oneDayAgo },
      expand: ["data.line_items"],
    });

    const results = {
      total: sessions.data.length,
      processed: 0,
      recovered: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 2. Iterate and fulfill
    for (const session of sessions.data) {
      if (session.payment_status === "paid") {
        try {
          const order = await fulfillOrder(session.id);
          results.processed++;
          if (
            order &&
            new Date(order.createdAt).getTime() > Date.now() - 60000
          ) {
            // Rough check if it was just created (recovered)
            results.recovered++;
          }
        } catch (error) {
          console.error(`Failed to reconcile session ${session.id}:`, error);
          results.errors.push(session.id);
        }
      } else {
        results.skipped++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Reconciliation failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
