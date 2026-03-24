import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { mealPlanService } from "@/lib/services/meal-plan.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const usage = await mealPlanService.getUsage(id);

    if (!usage) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    return NextResponse.json(usage);
  } catch (error) {
    console.error("[API] Failed to fetch meal plan usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plan usage" },
      { status: 500 },
    );
  }
}
