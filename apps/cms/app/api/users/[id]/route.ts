import { updateProfileRequestSchema } from "@fwe/validators";
import { NextRequest, NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { flavorProfileService } from "@/lib/services/flavor-profile.service";
import { mealPlanService } from "@/lib/services/meal-plan.service";
import { userService } from "@/lib/services/user.service";

/**
 * GET /api/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { user, guestMergeRequiresReview } =
      await userService.findByIdWithGuestMerge(id);
    const mealPlan = await mealPlanService.getPlanSummaryByUserId(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user without sensitive fields
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      deliveryAddress: user.deliveryAddress,
      deliveryCity: user.deliveryCity,
      deliveryPostal: user.deliveryPostal,
      deliveryNotes: user.deliveryNotes,
      profileComplete: user.profileComplete,
      onboardingStatus: user.onboardingStatus,
      guestMergeRequiresReview,
      mealPlan,
      flavorProfile: user.flavorProfile,
    });
  } catch (error) {
    console.error("[API] Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update user profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = updateProfileRequestSchema.safeParse({
      userId: id,
      ...body,
    });
    if (!validation.success) {
      const flattened = validation.error.flatten();
      const firstError =
        Object.values(flattened.fieldErrors)[0]?.[0] ||
        flattened.formErrors[0] ||
        "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      name,
      phone,
      deliveryAddress,
      deliveryCity,
      deliveryPostal,
      deliveryNotes,
      flavorProfile,
      onboardingStatus,
    } = validation.data;

    const updatedUser = await userService.updateProfile(id, {
      name,
      phone,
      deliveryAddress,
      deliveryCity,
      deliveryPostal,
      deliveryNotes,
    });

    const savedFlavorProfile = flavorProfile
      ? await flavorProfileService.upsertProfile(id, flavorProfile)
      : (await userService.findById(id))?.flavorProfile ?? null;

    if (onboardingStatus === "SKIPPED" && !flavorProfile) {
      await flavorProfileService.markOnboardingSkipped(id);
    }

    const refreshedUser = await userService.findById(id);
    const refreshedMealPlan = await mealPlanService.getPlanSummaryByUserId(id);

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      phone: updatedUser.phone,
      deliveryAddress: updatedUser.deliveryAddress,
      deliveryCity: updatedUser.deliveryCity,
      deliveryPostal: updatedUser.deliveryPostal,
      deliveryNotes: updatedUser.deliveryNotes,
      profileComplete: updatedUser.profileComplete,
      onboardingStatus: refreshedUser?.onboardingStatus ?? updatedUser.onboardingStatus,
      mealPlan: refreshedMealPlan,
      flavorProfile: savedFlavorProfile,
    });
  } catch (error) {
    console.error("[API] Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/users/[id]/profile-status
 * Check if user profile is complete (for middleware)
 */
