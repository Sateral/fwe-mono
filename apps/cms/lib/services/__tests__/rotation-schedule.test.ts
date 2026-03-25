import { describe, expect, it } from "vitest";

import {
  resolveOrderingWindow,
  resolveRotationPeriodKey,
  resolveRotationPeriodStartFromAnchor,
} from "../rotation-schedule";

describe("rotation-schedule", () => {
  it("opens ordering on Thursday at 3:00pm Toronto for the orderable fulfillment cycle", () => {
    const now = new Date("2026-01-08T20:00:00.000Z");

    expect(resolveOrderingWindow(now)).toEqual({
      startsAt: new Date("2026-01-08T20:00:00.000Z"),
      endsAt: new Date("2026-01-15T19:59:59.999Z"),
    });
  });

  it("groups two Thu-anchored fulfillment cycles into one rotation period from anchor", () => {
    const anchorFulfillmentStart = new Date("2026-01-08T05:00:00.000Z");
    const cycleA = new Date("2026-01-08T05:00:00.000Z");
    const cycleB = new Date("2026-01-15T05:00:00.000Z");
    const cycleC = new Date("2026-01-22T05:00:00.000Z");

    expect(
      resolveRotationPeriodStartFromAnchor(cycleA, anchorFulfillmentStart),
    ).toEqual(anchorFulfillmentStart);
    expect(
      resolveRotationPeriodStartFromAnchor(cycleB, anchorFulfillmentStart),
    ).toEqual(anchorFulfillmentStart);
    expect(
      resolveRotationPeriodStartFromAnchor(cycleC, anchorFulfillmentStart),
    ).toEqual(new Date("2026-01-22T05:00:00.000Z"));

    expect(resolveRotationPeriodKey(cycleA, anchorFulfillmentStart)).toBe(
      resolveRotationPeriodKey(cycleB, anchorFulfillmentStart),
    );
    expect(resolveRotationPeriodKey(cycleA, anchorFulfillmentStart)).not.toBe(
      resolveRotationPeriodKey(cycleC, anchorFulfillmentStart),
    );
  });
});
