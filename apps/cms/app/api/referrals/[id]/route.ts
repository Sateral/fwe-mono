import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { referralService } from "@/lib/services/referral.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const code = await referralService.getCodeWithUses(id);

    if (!code) {
      return NextResponse.json(
        { error: "Referral code not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(code);
  } catch (error) {
    console.error("[API] Failed to get referral code:", error);
    return NextResponse.json(
      { error: "Failed to get referral code" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status === "DISABLED") {
      const code = await referralService.deactivateCode(id);
      return NextResponse.json(code);
    }

    if (body.status === "ACTIVE") {
      const code = await referralService.activateCode(id);
      return NextResponse.json(code);
    }

    return NextResponse.json(
      { error: "status must be ACTIVE or DISABLED" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[API] Failed to update referral code:", error);
    return NextResponse.json(
      { error: "Failed to update referral code" },
      { status: 500 },
    );
  }
}
