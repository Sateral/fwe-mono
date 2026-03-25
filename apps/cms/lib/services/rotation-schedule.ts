/**
 * Toronto fulfillment cycles and ordering windows (America/Toronto).
 *
 * Fulfillment cycle: Thursday 00:00 through the following Wednesday 23:59:59.999.
 * `WeeklyRotation.weekStart` is that Thursday 00:00.
 *
 * Ordering (n+1): Thu 3:00pm through the next Thu 2:59:59.999 feeds the fulfillment
 * cycle that *starts* on the closing Thursday. While that window is open, customers
 * are ordering into that cycle; the chef may still be prepping the prior cycle.
 *
 * `RotationPeriod` groups two consecutive fulfillment cycles that share the same menu.
 */

import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BUSINESS_TIMEZONE = "America/Toronto";

/** Thursday 3:00pm local — ordering window opens */
export const ORDERING_OPEN = { hour: 15, minute: 0 } as const;

/** Thursday 2:59:59.999pm local — ordering window closes for the cycle starting that day */
export const ORDERING_CLOSE = {
  hour: 14,
  minute: 59,
  second: 59,
} as const;

/** JS weekday: 0 = Sunday, 4 = Thursday */
const THURSDAY_JS = 4;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When no rotation periods exist yet, pair 2-cycle groups from this Thursday 00:00 Toronto.
 * (2026-01-08 is a Thursday.)
 */
export const DEFAULT_ROTATION_ANCHOR_FULFILLMENT_START: Date = fromZonedTime(
  new Date(2026, 0, 8, 0, 0, 0, 0),
  BUSINESS_TIMEZONE,
);

type WallClock = {
  hour: number;
  minute: number;
  second?: number;
  millisecond?: number;
};

function toBusinessTime(date: Date): Date {
  return toZonedTime(date, BUSINESS_TIMEZONE);
}

function fromBusinessTime(date: Date): Date {
  return fromZonedTime(date, BUSINESS_TIMEZONE);
}

function clone(date: Date): Date {
  return new Date(date.getTime());
}

function getBusinessOrdinal(date: Date): number {
  const businessDate = toBusinessTime(date);

  return (
    Date.UTC(
      businessDate.getFullYear(),
      businessDate.getMonth(),
      businessDate.getDate(),
    ) / MS_PER_DAY
  );
}

function setWallClock(date: Date, wallClock: WallClock): Date {
  const businessDate = clone(toBusinessTime(date));

  businessDate.setHours(
    wallClock.hour,
    wallClock.minute,
    wallClock.second ?? 0,
    wallClock.millisecond ?? 0,
  );

  return fromBusinessTime(businessDate);
}

function shiftBusinessDays(date: Date, days: number): Date {
  const businessDate = clone(toBusinessTime(date));
  businessDate.setDate(businessDate.getDate() + days);

  return fromBusinessTime(businessDate);
}

export function formatBusinessTime(date: Date, pattern: string): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, pattern);
}

/** Start of the fulfillment cycle (Thursday 00:00 Toronto) containing `date`. */
export function resolveFulfillmentCycleStart(date: Date): Date {
  const businessDate = clone(toBusinessTime(date));
  const day = businessDate.getDay();
  const daysSinceThursday = (day - THURSDAY_JS + 7) % 7;
  businessDate.setDate(businessDate.getDate() - daysSinceThursday);
  businessDate.setHours(0, 0, 0, 0);

  return fromBusinessTime(businessDate);
}

/** End of cycle: Wednesday 23:59:59.999 after the given Thursday start. */
export function resolveFulfillmentCycleEnd(cycleStart: Date): Date {
  const start = clone(toBusinessTime(resolveFulfillmentCycleStart(cycleStart)));
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);

  return fromBusinessTime(start);
}

export function shiftFulfillmentCycle(cycleStart: Date, cycles: number): Date {
  return shiftBusinessDays(
    resolveFulfillmentCycleStart(cycleStart),
    cycles * 7,
  );
}

/**
 * Last instant of the ordering window for `fulfillmentCycleStart`
 * (that Thursday 2:59:59.999pm Toronto).
 */
export function resolveOrderCutoff(fulfillmentCycleStart: Date): Date {
  const thursday = resolveFulfillmentCycleStart(fulfillmentCycleStart);

  return setWallClock(thursday, {
    hour: ORDERING_CLOSE.hour,
    minute: ORDERING_CLOSE.minute,
    second: ORDERING_CLOSE.second,
    millisecond: 999,
  });
}

/**
 * Ordering window whose orders land in this fulfillment cycle
 * (previous Thu 3pm through this cycle's Thu 2:59:59.999pm).
 */
export function getOrderingWindowForFulfillmentCycle(
  fulfillmentCycleStart: Date,
) {
  const cycleThursday = resolveFulfillmentCycleStart(fulfillmentCycleStart);
  const windowStart = setWallClock(
    shiftBusinessDays(cycleThursday, -7),
    ORDERING_OPEN,
  );
  const windowEnd = resolveOrderCutoff(cycleThursday);

  return { windowStart, windowEnd };
}

/** @deprecated Use getOrderingWindowForFulfillmentCycle — arg is fulfillment cycle start */
export function getOrderingWindowForDeliveryWeek(fulfillmentCycleStart: Date) {
  return getOrderingWindowForFulfillmentCycle(fulfillmentCycleStart);
}

/**
 * Fulfillment cycle customers are ordering into right now (n+1 vs the cycle calendar).
 */
export function resolveOrderableFulfillmentCycleStart(now: Date): Date {
  const currentCycle = resolveFulfillmentCycleStart(now);
  const cutoff = resolveOrderCutoff(currentCycle);

  if (now <= cutoff) {
    return currentCycle;
  }

  return shiftFulfillmentCycle(currentCycle, 1);
}

/** @deprecated Use resolveOrderableFulfillmentCycleStart */
export function resolveOrderableWeekStart(now: Date): Date {
  return resolveOrderableFulfillmentCycleStart(now);
}

export function resolveRotationPeriodStartFromAnchor(
  fulfillmentCycleStart: Date,
  anchorFulfillmentStart: Date,
): Date {
  const normalized = resolveFulfillmentCycleStart(fulfillmentCycleStart);
  const anchor = resolveFulfillmentCycleStart(anchorFulfillmentStart);
  const diffWeeks = Math.floor(
    (getBusinessOrdinal(normalized) - getBusinessOrdinal(anchor)) / 7,
  );
  const periodOffsetWeeks = Math.floor(diffWeeks / 2) * 2;

  return shiftFulfillmentCycle(anchor, periodOffsetWeeks);
}

export function resolveRotationPeriodStart(
  fulfillmentCycleStart: Date,
  anchorFulfillmentStart: Date = fulfillmentCycleStart,
): Date {
  return resolveRotationPeriodStartFromAnchor(
    fulfillmentCycleStart,
    anchorFulfillmentStart,
  );
}

export function resolveRotationPeriodKey(
  fulfillmentCycleStart: Date,
  anchorFulfillmentStart: Date = fulfillmentCycleStart,
): string {
  return formatBusinessTime(
    resolveRotationPeriodStart(fulfillmentCycleStart, anchorFulfillmentStart),
    "yyyy-MM-dd",
  );
}

export function resolveOrderingWindow(now: Date) {
  const orderableCycleStart = resolveOrderableFulfillmentCycleStart(now);
  const { windowStart, windowEnd } =
    getOrderingWindowForFulfillmentCycle(orderableCycleStart);

  return {
    startsAt: windowStart,
    endsAt: windowEnd,
  };
}
