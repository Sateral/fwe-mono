import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { referralService } from "@/lib/services/referral.service";

export async function GET(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const codes = await referralService.listCodes();
    return NextResponse.json(codes);
  } catch (error) {
    console.error("[API] Failed to list referral codes:", error);
    return NextResponse.json(
      { error: "Failed to list referral codes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.ownerUserId || !body.code) {
      return NextResponse.json(
        { error: "ownerUserId and code are required" },
        { status: 400 },
      );
    }

    const code = await referralService.createCode({
      ownerUserId: body.ownerUserId,
      code: body.code,
      maxUses: body.maxUses ?? null,
    });

    return NextResponse.json(code, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create referral code:", error);

    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A referral code with that value or owner already exists"
        : "Failed to create referral code";

    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("Unique constraint") ? 409 : 500 },
    );
  }
}
