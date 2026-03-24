import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  rotationPeriod: {
    findFirst: vi.fn(),
  },
  weeklyRotation: {
    findUnique: vi.fn(),
  },
}));

vi.mock("../../prisma", () => ({
  default: prismaMock,
}));

import { weeklyRotationService } from "../weekly-rotation.service";

describe("weeklyRotationService period menu authority", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    prismaMock.rotationPeriod.findFirst.mockReset();
    prismaMock.weeklyRotation.findUnique.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the linked rotation period menu even when it is empty", async () => {
    prismaMock.weeklyRotation.findUnique.mockResolvedValue({
      id: "rotation_1",
      weekStart: new Date("2026-01-12T05:00:00.000Z"),
      weekEnd: new Date("2026-01-19T04:59:59.999Z"),
      orderCutoff: new Date("2026-01-15T19:59:59.999Z"),
      status: "PUBLISHED",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      meals: [{ id: "legacy_meal" }],
      rotationPeriod: {
        id: "period_1",
        name: "2026-01-12",
        status: "DRAFT",
        meals: [],
      },
    });

    const rotation = await weeklyRotationService.getRotationByWeek(
      new Date("2026-01-12T05:00:00.000Z"),
    );

    expect(rotation?.meals).toEqual([]);
  });
});
