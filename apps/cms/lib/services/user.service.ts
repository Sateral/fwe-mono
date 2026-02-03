import type { UpdateProfileInput } from "@fwe/validators";

import prisma from "@/lib/prisma";

// ============================================
// User Service
// ============================================

export const userService = {
  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Update user profile and mark as complete.
   * Used during onboarding flow.
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    console.log(`[UserService] Updating profile for user ${userId}`);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const nextName = (data.name ?? existingUser?.name ?? "").trim();
    const nextEmail = (existingUser?.email ?? "").trim();
    const profileComplete = Boolean(nextName) && Boolean(nextEmail);
    const normalizeNullable = (value: string | null | undefined) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    return await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name?.trim(),
        phone: normalizeNullable(data.phone),
        deliveryAddress: normalizeNullable(data.deliveryAddress),
        deliveryCity: normalizeNullable(data.deliveryCity),
        deliveryPostal: normalizeNullable(data.deliveryPostal),
        deliveryNotes: normalizeNullable(data.deliveryNotes),
        profileComplete,
      },
    });
  },

  /**
   * Check if user has completed their profile.
   */
  async isProfileComplete(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileComplete: true },
    });
    return user?.profileComplete ?? false;
  },
};
