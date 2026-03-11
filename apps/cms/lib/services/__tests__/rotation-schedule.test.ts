import { describe, expect, it } from "vitest";

import {
  resolveOrderingWindow,
  resolveRotationPeriodKey,
} from "../rotation-schedule";

describe("rotation-schedule", () => {
  it("opens ordering on Thursday at 3:00pm Toronto", () => {
    const now = new Date("2026-01-08T20:00:00.000Z");

    expect(resolveOrderingWindow(now)).toEqual({
      startsAt: new Date("2026-01-08T20:00:00.000Z"),
      endsAt: new Date("2026-01-22T19:59:59.999Z"),
    });
  });

  it("groups two delivery weeks into one rotation period", () => {
    const weekStartA = new Date("2026-01-12T05:00:00.000Z");
    const weekStartB = new Date("2026-01-19T05:00:00.000Z");
    const weekStartC = new Date("2026-01-26T05:00:00.000Z");

    expect(resolveRotationPeriodKey(weekStartA)).toBe(
      resolveRotationPeriodKey(weekStartB),
    );
    expect(resolveRotationPeriodKey(weekStartA)).not.toBe(
      resolveRotationPeriodKey(weekStartC),
    );
  });
});
