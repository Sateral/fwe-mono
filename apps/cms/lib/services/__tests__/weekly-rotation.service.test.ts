import { describe, expect, it } from "vitest";

import {
  getOrderCutoff,
  getOrderingWindowForDeliveryWeek,
} from "../weekly-rotation.service";

describe("weekly-rotation.service", () => {
  it("builds the current ordering window for a delivery week", () => {
    const deliveryWeekStart = new Date("2026-01-14T05:00:00.000Z");

    expect(getOrderingWindowForDeliveryWeek(deliveryWeekStart)).toEqual({
      windowStart: new Date("2026-01-07T05:00:00.000Z"),
      windowEnd: new Date("2026-01-14T05:00:00.000Z"),
    });
  });

  it("uses the Tuesday before delivery week as the current order cutoff", () => {
    const deliveryWeekStart = new Date("2026-01-14T05:00:00.000Z");

    expect(getOrderCutoff(deliveryWeekStart)).toEqual(
      new Date("2026-01-14T04:59:59.999Z"),
    );
  });
});
