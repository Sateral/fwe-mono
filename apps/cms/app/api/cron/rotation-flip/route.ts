import { NextResponse } from "next/server";

/**
 * Legacy cron endpoint. Menu visibility no longer depends on publish/flip;
 * kept for schedulers that still ping this URL.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ ok: true, message: "no-op" });
}
