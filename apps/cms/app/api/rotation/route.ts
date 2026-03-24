import { NextRequest, NextResponse } from "next/server";
import {
  serializeAvailableMeals,
  serializeRotation,
  serializeRotationSummary,
} from "@/lib/api-serializers";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";
import { requireInternalAuth } from "@/lib/api-auth";

/**
 * GET /api/rotation
 * Get current published rotation or rotation for a specific week.
 *
 * Query params:
 * - week: ISO date string for specific week (optional)
 * - available: if "true", returns available meals for ordering
 */
export async function GET(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");
    const availableParam = searchParams.get("available");

    // If requesting available meals
    if (availableParam === "true") {
      const result = await weeklyRotationService.getAvailableMeals();
      return NextResponse.json(serializeAvailableMeals(result));
    }

    // If requesting specific week
    if (weekParam) {
      const weekStart = new Date(weekParam);
      const rotation = await weeklyRotationService.getRotationByWeek(weekStart);

      if (!rotation) {
        return NextResponse.json(
          { error: "No rotation found for this week" },
          { status: 404 },
        );
      }

      return NextResponse.json(serializeRotation(rotation));
    }

    // Default: get current rotation
    const rotation = await weeklyRotationService.getCurrentRotation();

    if (!rotation) {
      return NextResponse.json({
        message: "No active rotation",
        isOrderingOpen: false,
      });
    }

    const isOrderingOpen = await weeklyRotationService.isOrderingOpen();

    return NextResponse.json({
      ...serializeRotation(rotation),
      isOrderingOpen,
    });
  } catch (error) {
    console.error("[API] Error fetching rotation:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rotation
 * Create a new rotation.
 *
 * Body: { weekStart: ISO date string }
 */
export async function POST(request: NextRequest) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { weekStart } = body;

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 },
      );
    }

    const rotation = await weeklyRotationService.createRotation(
      new Date(weekStart),
    );

    return NextResponse.json(serializeRotationSummary(rotation), { status: 201 });
  } catch (error) {
    console.error("[API] Error creating rotation:", error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A rotation already exists for this week" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create rotation" },
      { status: 500 },
    );
  }
}
