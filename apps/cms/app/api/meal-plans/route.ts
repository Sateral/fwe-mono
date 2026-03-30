import { z } from "zod";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { mealPlanService } from "@/lib/services/meal-plan.service";

const purchaseMealPlanSchema = z.object({
  userId: z.string().min(1),
  weeklyCreditCap: z.number().int().min(0),
  creditAmount: z.number().int().positive(),
  autoRenew: z.boolean().optional(),
  priceAtPurchase: z.number().min(0).optional(),
  billingInterval: z.string().min(1).max(64).optional(),
  billingCurrency: z.string().length(3).optional(),
});

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = purchaseMealPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const mealPlan = await mealPlanService.purchasePlan(parsed.data);

    return NextResponse.json(mealPlan, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to purchase meal plan:", error);
    return NextResponse.json(
      { error: "Failed to purchase meal plan" },
      { status: 500 },
    );
  }
}
