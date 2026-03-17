import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  meal: {
    findMany: vi.fn(),
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
    prismaMock.weeklyRotation.findUnique.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds the current ordering window for a delivery week", () => {
    const deliveryWeekStart = new Date("2026-01-12T05:00:00.000Z");

    expect(getOrderingWindowForDeliveryWeek(deliveryWeekStart)).toEqual({
      windowStart: new Date("2026-01-08T20:00:00.000Z"),
      windowEnd: new Date("2026-01-15T20:00:00.000Z"),
    });
  });

  it("uses Thursday at 2:59:59.999pm Toronto as the delivery-week cutoff", () => {
    const deliveryWeekStart = new Date("2026-01-12T05:00:00.000Z");

    expect(getOrderCutoff(deliveryWeekStart)).toEqual(
      new Date("2026-01-15T19:59:59.999Z"),
    );
  });

  it("returns orderable rotating meals without signature fallback", async () => {
    prismaMock.meal.findMany.mockResolvedValue([
      { id: "signature-1", mealType: "SIGNATURE", isActive: true },
      { id: "signature-2", mealType: "SIGNATURE", isActive: true },
    ]);
    prismaMock.weeklyRotation.findUnique.mockResolvedValue({
      id: "rotation-1",
      status: "PUBLISHED",
      weekStart: new Date("2026-01-12T05:00:00.000Z"),
      weekEnd: new Date("2026-01-19T04:59:59.999Z"),
      orderCutoff: new Date("2026-01-15T19:59:59.999Z"),
      meals: [
        { id: "rotating-1", mealType: "ROTATING", isActive: true },
        { id: "rotating-2", mealType: "ROTATING", isActive: true },
        { id: "rotating-3", mealType: "ROTATING", isActive: true },
      ],
      rotationPeriod: null,
    });

    const result = await weeklyRotationService.getAvailableMeals();

    expect((result as { signatureMeals?: unknown }).signatureMeals).toBeUndefined();
    expect(result.meals).toHaveLength(3);
  });
});
