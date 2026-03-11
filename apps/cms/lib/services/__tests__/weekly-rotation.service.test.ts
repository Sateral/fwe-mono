import { describe, expect, it } from "vitest";

import {
  getOrderCutoff,
  getOrderingWindowForDeliveryWeek,
} from "../weekly-rotation.service";

describe("weekly-rotation.service", () => {
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
});
