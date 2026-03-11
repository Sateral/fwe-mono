import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeMeal } from "@/lib/api-serializers";
import { mealService } from "@/lib/services/meal.service";

// ============================================
// GET /api/meals/slug/[slug] - Get meal by slug
// ============================================

/**
 * Retrieve a meal by its unique slug.
 * Used by commerce app for meal detail pages.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { slug } = await params;
    console.log(`[API] GET /api/meals/slug/${slug}`);

    const meal = await mealService.getMealBySlug(slug);

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    return NextResponse.json(serializeMeal(meal));
  } catch (error) {
    console.error("[API] Failed to fetch meal by slug:", error);
    return NextResponse.json(
      { error: "Failed to fetch meal" },
      { status: 500 },
    );
  }
}
