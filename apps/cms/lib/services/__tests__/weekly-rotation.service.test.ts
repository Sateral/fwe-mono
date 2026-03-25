import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  meal: {
    findMany: vi.fn(),
  },
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

import {
  getOrderCutoff,
  getOrderingWindowForDeliveryWeek,
  weeklyRotationService,
} from "../weekly-rotation.service";

describe("weekly-rotation.service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-12T17:00:00.000Z"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    prismaMock.meal.findMany.mockReset();
    prismaMock.rotationPeriod.findFirst.mockReset();
    prismaMock.weeklyRotation.findUnique.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds the ordering window that feeds a fulfillment cycle (Thu 3pm prior Thu to cutoff)", () => {
    const fulfillmentCycleStart = new Date("2026-01-15T05:00:00.000Z");

    expect(getOrderingWindowForDeliveryWeek(fulfillmentCycleStart)).toEqual({
      windowStart: new Date("2026-01-08T20:00:00.000Z"),
      windowEnd: new Date("2026-01-15T19:59:59.999Z"),
    });
  });

  it("uses Thursday at 2:59:59.999pm Toronto as the fulfillment-cycle order cutoff", () => {
    const fulfillmentCycleStart = new Date("2026-01-15T05:00:00.000Z");

    expect(getOrderCutoff(fulfillmentCycleStart)).toEqual(
      new Date("2026-01-15T19:59:59.999Z"),
    );
  });

  it("returns orderable period meals for DRAFT on-menu rotations", async () => {
    prismaMock.weeklyRotation.findUnique.mockResolvedValue({
      id: "rotation-1",
      status: "DRAFT",
      weekStart: new Date("2026-01-15T05:00:00.000Z"),
      weekEnd: new Date("2026-01-22T04:59:59.999Z"),
      orderCutoff: new Date("2026-01-15T19:59:59.999Z"),
      meals: [
        { id: "period-1", isActive: true },
        { id: "period-2", isActive: true },
        { id: "period-3", isActive: true },
      ],
      rotationPeriod: null,
    });

    const result = await weeklyRotationService.getAvailableMeals();

    expect(result.meals).toHaveLength(3);
  });

  it("lists active menu meals without meal type filtering", async () => {
    prismaMock.meal.findMany.mockResolvedValue([
      { id: "meal-1", isActive: true },
    ]);

    const meals = await weeklyRotationService.getMenuMeals();

    expect(prismaMock.meal.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      include: { tags: true },
      orderBy: { updatedAt: "desc" },
    });
    expect(meals).toEqual([{ id: "meal-1", isActive: true }]);
  });
});
