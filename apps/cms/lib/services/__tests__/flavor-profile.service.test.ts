import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  flavorProfile: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import { flavorProfileService } from "../flavor-profile.service";

describe("flavor-profile.service", () => {
  beforeEach(() => {
    prismaMock.flavorProfile.upsert.mockReset();
    prismaMock.flavorProfile.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.$transaction.mockReset();
  });

  it("saves goals, restrictions, preferences, and involvement mode", async () => {
    prismaMock.flavorProfile.upsert.mockResolvedValue({
      id: "profile_123",
      userId: "user_123",
      goals: ["fat-loss", "save-time"],
      restrictions: ["shellfish"],
      preferences: ["high-protein", "spicy"],
      involvement: "HANDS_OFF",
    });
    prismaMock.user.update.mockResolvedValue({ id: "user_123" });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );

    const profile = await flavorProfileService.upsertProfile("user_123", {
      goals: ["fat-loss", "save-time"],
      restrictions: ["shellfish"],
      preferences: ["high-protein", "spicy"],
      involvement: "HANDS_OFF",
    });

    expect(prismaMock.flavorProfile.upsert).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      create: {
        userId: "user_123",
        goals: ["fat-loss", "save-time"],
        restrictions: ["shellfish"],
        preferences: ["high-protein", "spicy"],
        involvement: "HANDS_OFF",
      },
      update: {
        goals: ["fat-loss", "save-time"],
        restrictions: ["shellfish"],
        preferences: ["high-protein", "spicy"],
        involvement: "HANDS_OFF",
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: { onboardingStatus: "COMPLETED" },
    });
    expect(profile.involvement).toBe("HANDS_OFF");
  });

  it("marks onboarding skipped explicitly", async () => {
    prismaMock.user.update.mockResolvedValue({
      id: "user_123",
      onboardingStatus: "SKIPPED",
    });

    await flavorProfileService.markOnboardingSkipped("user_123");

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: { onboardingStatus: "SKIPPED" },
    });
  });
});
