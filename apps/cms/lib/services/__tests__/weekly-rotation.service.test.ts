import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  meal: {
    findMany: vi.fn(),
  },
  rotationPeriod: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  weeklyRotation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../prisma", () => ({
  default: prismaMock,
}));

import {
  resolveFulfillmentCycleStart,
  resolveOrderableFulfillmentCycleStart,
  resolveOrderCutoff,
  shiftFulfillmentCycle,
} from "../rotation-schedule";
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
    prismaMock.rotationPeriod.findUnique.mockReset();
    prismaMock.weeklyRotation.findUnique.mockReset();
    prismaMock.weeklyRotation.findMany.mockReset();
    prismaMock.weeklyRotation.update.mockReset();
    prismaMock.meal.findMany.mockResolvedValue([]);
    prismaMock.weeklyRotation.findMany.mockResolvedValue([]);
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
      meals: [{ id: "period-1" }, { id: "period-2" }, { id: "period-3" }],
      rotationPeriod: null,
    });

    const result = await weeklyRotationService.getAvailableMeals();

    expect(result.meals).toHaveLength(3);
  });

  it("lists active menu meals without meal type filtering", async () => {
    prismaMock.meal.findMany.mockResolvedValue([{ id: "meal-1" }]);

    const meals = await weeklyRotationService.getMenuMeals();

    expect(prismaMock.meal.findMany).toHaveBeenCalledWith({
      include: { tags: true },
      orderBy: { updatedAt: "desc" },
    });
    expect(meals).toEqual([{ id: "meal-1" }]);
  });

  it("falls back to calendar-current rotation when orderable week has no row", async () => {
    vi.setSystemTime(new Date("2026-03-26T20:00:00.000Z"));
    const now = new Date("2026-03-26T20:00:00.000Z");
    const currentFulfillment = resolveFulfillmentCycleStart(now);
    const orderableTarget = resolveOrderableFulfillmentCycleStart(now);

    expect(currentFulfillment.getTime()).not.toBe(orderableTarget.getTime());

    prismaMock.weeklyRotation.findUnique.mockImplementation(
      (args: { where: { weekStart: Date } }) => {
        const w = args.where.weekStart.getTime();
        if (w === orderableTarget.getTime()) return Promise.resolve(null);
        if (w === currentFulfillment.getTime()) {
          return Promise.resolve({
            id: "rot-current",
            status: "DRAFT",
            weekStart: currentFulfillment,
            weekEnd: new Date("2026-04-02T03:59:59.999Z"),
            orderCutoff: new Date("2026-03-26T19:59:59.999Z"),
            meals: [{ id: "m1", name: "Bowl" }],
            rotationPeriod: null,
          });
        }
        return Promise.resolve(null);
      },
    );

    const result = await weeklyRotationService.getOrderableRotation();

    expect(result.rotation?.meals).toHaveLength(1);
    expect(result.deliveryWeekStart?.getTime()).toBe(orderableTarget.getTime());
    expect(result.orderCutoff.getTime()).toBe(
      resolveOrderCutoff(orderableTarget).getTime(),
    );
    expect(prismaMock.weeklyRotation.findUnique.mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("uses week before current when orderable and current rows are both missing", async () => {
    vi.setSystemTime(new Date("2026-04-06T16:00:00.000Z"));
    const now = new Date("2026-04-06T16:00:00.000Z");
    const target = resolveOrderableFulfillmentCycleStart(now);
    const current = resolveFulfillmentCycleStart(now);
    const older = shiftFulfillmentCycle(current, -1);

    prismaMock.weeklyRotation.findUnique.mockImplementation(
      (args: { where: { weekStart: Date } }) => {
        const w = args.where.weekStart.getTime();
        if (w === target.getTime() || w === current.getTime()) {
          return Promise.resolve(null);
        }
        if (w === older.getTime()) {
          return Promise.resolve({
            id: "rot-older",
            status: "DRAFT",
            weekStart: older,
            weekEnd: new Date("2026-03-26T03:59:59.999Z"),
            orderCutoff: new Date("2026-03-19T19:59:59.999Z"),
            meals: [{ id: "m1", name: "Bowl" }],
            rotationPeriod: null,
          });
        }
        return Promise.resolve(null);
      },
    );

    const result = await weeklyRotationService.getOrderableRotation();

    expect(result.rotation?.meals).toHaveLength(1);
    expect(result.deliveryWeekStart?.getTime()).toBe(target.getTime());
    expect(prismaMock.weeklyRotation.findUnique.mock.calls.length).toBeGreaterThanOrEqual(
      3,
    );
  });
});
