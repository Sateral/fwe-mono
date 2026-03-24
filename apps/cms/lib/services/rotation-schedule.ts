import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BUSINESS_TIMEZONE = "America/Toronto";
export const ORDERING_OPEN = { day: 4, hour: 15, minute: 0 } as const;
export const ORDERING_CLOSE = {
  day: 4,
  hour: 14,
  minute: 59,
  second: 59,
} as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONDAY_INDEX = 1;
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

function ordinalToBusinessDate(ordinal: number): Date {
  const utcDate = new Date(ordinal * MS_PER_DAY);
  const businessDate = new Date(
    Date.UTC(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  return fromBusinessTime(businessDate);
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

export function resolveDeliveryWeekStart(date: Date): Date {
  const businessDate = clone(toBusinessTime(date));
  const day = businessDate.getDay();
  const daysToSubtract = (day - MONDAY_INDEX + 7) % 7;

  businessDate.setDate(businessDate.getDate() - daysToSubtract);
  businessDate.setHours(0, 0, 0, 0);

  return fromBusinessTime(businessDate);
}

export function resolveDeliveryWeekEnd(weekStart: Date): Date {
  const businessWeekStart = clone(toBusinessTime(resolveDeliveryWeekStart(weekStart)));

  businessWeekStart.setDate(businessWeekStart.getDate() + 6);
  businessWeekStart.setHours(23, 59, 59, 999);

  return fromBusinessTime(businessWeekStart);
}

export function shiftDeliveryWeek(weekStart: Date, weeks: number): Date {
  return shiftBusinessDays(resolveDeliveryWeekStart(weekStart), weeks * 7);
}

function resolveIsoWeekYear(weekStart: Date): number {
  const thursday = toBusinessTime(shiftBusinessDays(weekStart, 3));

  return thursday.getFullYear();
}

function resolveIsoWeekYearStart(weekStart: Date): Date {
  const isoWeekYear = resolveIsoWeekYear(weekStart);
  const januaryFourth = fromBusinessTime(
    new Date(Date.UTC(isoWeekYear, 0, 4, 0, 0, 0, 0)),
  );

  return resolveDeliveryWeekStart(januaryFourth);
}

export function resolveOrderCutoff(deliveryWeekStart: Date): Date {
  const thursdayOfDeliveryWeek = shiftBusinessDays(
    resolveDeliveryWeekStart(deliveryWeekStart),
    ORDERING_CLOSE.day - MONDAY_INDEX,
  );

  return setWallClock(thursdayOfDeliveryWeek, {
    hour: ORDERING_CLOSE.hour,
    minute: ORDERING_CLOSE.minute,
    second: ORDERING_CLOSE.second,
    millisecond: 999,
  });
}

export function getOrderingWindowForDeliveryWeek(deliveryWeekStart: Date) {
  const weekStart = resolveDeliveryWeekStart(deliveryWeekStart);
  const previousThursday = shiftBusinessDays(weekStart, -4);
  const currentThursday = shiftBusinessDays(
    weekStart,
    ORDERING_OPEN.day - MONDAY_INDEX,
  );

  return {
    windowStart: setWallClock(previousThursday, {
      hour: ORDERING_OPEN.hour,
      minute: ORDERING_OPEN.minute,
    }),
    windowEnd: setWallClock(currentThursday, {
      hour: ORDERING_OPEN.hour,
      minute: ORDERING_OPEN.minute,
    }),
  };
}

export function resolveOrderableWeekStart(now: Date): Date {
  const currentWeekStart = resolveDeliveryWeekStart(now);
  const currentWeekCutoff = resolveOrderCutoff(currentWeekStart);

  if (now <= currentWeekCutoff) {
    return currentWeekStart;
  }

  return shiftDeliveryWeek(currentWeekStart, 1);
}

export function resolveRotationPeriodStart(weekStart: Date): Date {
  const normalizedWeekStart = resolveDeliveryWeekStart(weekStart);
  const isoWeekYearStart = resolveIsoWeekYearStart(normalizedWeekStart);
  const diffWeeks = Math.floor(
    (getBusinessOrdinal(normalizedWeekStart) - getBusinessOrdinal(isoWeekYearStart)) /
      7,
  );
  const periodOffsetWeeks = Math.floor(diffWeeks / 2) * 2;

  return shiftDeliveryWeek(isoWeekYearStart, periodOffsetWeeks);
}

export function resolveRotationPeriodKey(weekStart: Date): string {
  return formatBusinessTime(resolveRotationPeriodStart(weekStart), "yyyy-MM-dd");
}

export function resolveOrderingWindow(now: Date) {
  const orderableWeekStart = resolveOrderableWeekStart(now);
  const rotationPeriodStart = resolveRotationPeriodStart(orderableWeekStart);
  const secondWeekStart = shiftDeliveryWeek(rotationPeriodStart, 1);
  const { windowStart } = getOrderingWindowForDeliveryWeek(rotationPeriodStart);

  return {
    startsAt: windowStart,
    endsAt: resolveOrderCutoff(secondWeekStart),
  };
}
