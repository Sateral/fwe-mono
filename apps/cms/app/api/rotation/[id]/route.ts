import { NextRequest, NextResponse } from "next/server";
import { requireInternalAuth } from "@/lib/api-auth";
import { serializeRotationSummary } from "@/lib/api-serializers";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

/**
 * GET /api/rotation/[id]
 * Get a specific rotation by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    // For now, we'll fetch all and find by ID
    // Could optimize with a dedicated service method
    const rotations = await weeklyRotationService.getAllRotations();
    const rotation = rotations.find((r) => r.id === id);

    if (!rotation) {
      return NextResponse.json(
        { error: "Rotation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeRotationSummary(rotation));
  } catch (error) {
    console.error("[API] Error fetching rotation:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/rotation/[id]
 * Update rotation (meals or status).
 *
 * Body: { mealIds?: string[], status?: "DRAFT" | "ARCHIVED" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { mealIds, status } = body;

    let rotation;

    // Update meals if provided
    if (mealIds && Array.isArray(mealIds)) {
      rotation = await weeklyRotationService.updateRotationMeals(id, mealIds);
    }

    // Update status if provided
    if (status) {
      if (status === "DRAFT") {
        rotation = await weeklyRotationService.unarchiveRotation(id);
      } else if (status === "ARCHIVED") {
        rotation = await weeklyRotationService.archiveRotation(id);
      }
    }

    if (!rotation) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    return NextResponse.json(serializeRotationSummary(rotation));
  } catch (error) {
    console.error("[API] Error updating rotation:", error);
    return NextResponse.json(
      { error: "Failed to update rotation" },
      { status: 500 },
    );
  }
}
