import { onboardingStatusSchema, upsertFlavorProfileRequestSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { flavorProfileService } from "@/lib/services/flavor-profile.service";

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = upsertFlavorProfileRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await flavorProfileService.upsertProfile(
      parsed.data.userId,
      parsed.data,
    );

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[API] Failed to save onboarding profile:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = onboardingStatusSchema.safeParse(body.status);
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (!userId || !parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data === "SKIPPED") {
      const user = await flavorProfileService.markOnboardingSkipped(userId);
      return NextResponse.json({ userId: user.id, onboardingStatus: "SKIPPED" });
    }

    return NextResponse.json({ error: "Unsupported onboarding status" }, { status: 400 });
  } catch (error) {
    console.error("[API] Failed to update onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding status" },
      { status: 500 },
    );
  }
}
