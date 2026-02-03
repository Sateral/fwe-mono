import { NextRequest, NextResponse } from "next/server";
import { userService, UpdateProfileInput } from "@/lib/services/user.service";
import { z } from "zod";
import { requireInternalAuth } from "@/lib/api-auth";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

// Validation schema for profile update
const updateProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().trim().min(1, "Name is required").optional(),
  phone: z.preprocess(
    emptyToNull,
    z.string().min(10, "Valid phone number required").nullable().optional()
  ),
  deliveryAddress: z.preprocess(
    emptyToNull,
    z.string().min(5, "Address is required").nullable().optional()
  ),
  deliveryCity: z.preprocess(
    emptyToNull,
    z.string().min(2, "City is required").nullable().optional()
  ),
  deliveryPostal: z.preprocess(
    emptyToNull,
    z.string().min(3, "Postal code is required").nullable().optional()
  ),
  deliveryNotes: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),
});

/**
 * GET /api/users/[id]
 * Get user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const user = await userService.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user without sensitive fields
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      deliveryAddress: user.deliveryAddress,
      deliveryCity: user.deliveryCity,
      deliveryPostal: user.deliveryPostal,
      deliveryNotes: user.deliveryNotes,
      profileComplete: user.profileComplete,
    });
  } catch (error) {
    console.error("[API] Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update user profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = updateProfileSchema.safeParse({ userId: id, ...body });
    if (!validation.success) {
      const flattened = validation.error.flatten();
      const firstError = Object.values(flattened.fieldErrors)[0]?.[0] 
        || flattened.formErrors[0] 
        || "Validation failed";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const {
      name,
      phone,
      deliveryAddress,
      deliveryCity,
      deliveryPostal,
      deliveryNotes,
    } = validation.data;

    const updatedUser = await userService.updateProfile(id, {
      name,
      phone,
      deliveryAddress,
      deliveryCity,
      deliveryPostal,
      deliveryNotes,
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      deliveryAddress: updatedUser.deliveryAddress,
      deliveryCity: updatedUser.deliveryCity,
      deliveryPostal: updatedUser.deliveryPostal,
      deliveryNotes: updatedUser.deliveryNotes,
      profileComplete: updatedUser.profileComplete,
    });
  } catch (error) {
    console.error("[API] Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/[id]/profile-status
 * Check if user profile is complete (for middleware)
 */
