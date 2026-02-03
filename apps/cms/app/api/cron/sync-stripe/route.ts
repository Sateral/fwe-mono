import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { ensureOrderFromSession } from "@/lib/stripe-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const since = Math.floor(Date.now() / 1000) - 72 * 60 * 60;

    const results = {
      total: 0,
      processed: 0,
      recovered: 0,
      skipped: 0,
      errors: [] as string[],
    };

    let startingAfter: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: since },
        starting_after: startingAfter,
      });

      results.total += page.data.length;

      for (const session of page.data) {
        if (session.payment_status === "paid") {
          try {
            const order = await ensureOrderFromSession(session.id);
            results.processed++;

            if (order && order.createdAt.getTime() > Date.now() - 60000) {
              results.recovered++;
            }
          } catch (error) {
            console.error(
              `[Cron] Failed to reconcile session ${session.id}:`,
              error,
            );
            results.errors.push(session.id);
          }
        } else {
          results.skipped++;
        }
      }

      hasMore = page.has_more;
      startingAfter = page.data.at(-1)?.id;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Cron] Reconciliation failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
