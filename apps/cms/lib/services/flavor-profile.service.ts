import type { FlavorProfileInput } from "@fwe/validators";

import prisma from "@/lib/prisma";

function normalizeList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export const flavorProfileService = {
  async getProfileByUserId(userId: string) {
    return prisma.flavorProfile.findUnique({
      where: { userId },
    });
  },

  async upsertProfile(userId: string, input: FlavorProfileInput) {
    const payload = {
      goals: normalizeList(input.goals),
      restrictions: normalizeList(input.restrictions),
      preferences: normalizeList(input.preferences),
      involvement: input.involvement,
    };

    const profile = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.flavorProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...payload,
        },
        update: payload,
      });

      await tx.user.update({
        where: { id: userId },
        data: { onboardingStatus: "COMPLETED" },
      });

      return savedProfile;
    });

    return profile;
  },

  async markOnboardingSkipped(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: "SKIPPED" },
    });
  },
};
