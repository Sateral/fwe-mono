import { mealSchema } from "@fwe/validators";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { mealService } from "@/lib/services/meal.service";

// ============================================
// GET /api/meals - List meals
// ============================================

/**
 * Get meals with optional filtering.
 *
 * Query params:
 * - featured=true: Only featured meals
 * - tag=TagName: Filter by dietary tag
 */
export async function GET(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured");
    const tag = searchParams.get("tag");

    let meals;

    if (featured === "true") {
      console.log("[API] GET /api/meals?featured=true");
      meals = await mealService.getFeaturedMeals();
    } else if (tag) {
      console.log(`[API] GET /api/meals?tag=${tag}`);
      meals = await mealService.getMealsByTag(tag);
    } else {
      console.log("[API] GET /api/meals (all)");
      meals = await mealService.getMeals();
    }

    return NextResponse.json(meals);
  } catch (error) {
    console.error("[API] Failed to fetch meals:", error);
    return NextResponse.json(
      { error: "Failed to fetch meals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const data = await request.json();

    const parsed = mealSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid meal data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const meal = await mealService.createMeal(parsed.data);
    revalidatePath("/dashboard/menu");
    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 },
    );
  }
}
