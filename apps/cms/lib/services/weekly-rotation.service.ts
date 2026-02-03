import { RotationStatus } from "@fwe/db";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import prisma from "@/lib/prisma";

// ============================================
// Weekly Ordering System Logic
// ============================================
//
// WEEK DEFINITION:
// - Week runs Wednesday to Tuesday (not Mon-Sun)
// - Each WeeklyRotation represents a DELIVERY WEEK
//
// WORKFLOW:
// - Orders placed in Week N are delivered in Week N+1
// - Order cutoff is Tuesday 11:59 PM of Week N (the week BEFORE delivery)
//
// EXAMPLE (today is Wednesday Jan 7, 2026):
// - Current ordering window: Jan 7 (Wed) - Jan 13 (Tue) 11:59 PM
// - These orders will be delivered: Jan 14-20 (the NEXT week)
// - Delivery week rotation: weekStart=Jan 14, weekEnd=Jan 20
// - Order cutoff for that rotation: Jan 13 (Tuesday BEFORE delivery week)
//
// KEY DATES FOR A ROTATION:
// - weekStart: Wednesday of DELIVERY week (when prep begins)
// - weekEnd: Tuesday of DELIVERY week (end of delivery period)
// - orderCutoff: Tuesday BEFORE weekStart (last day to place orders)
//
// ============================================

// ============================================
// Types
// ============================================

export interface CreateRotationInput {
  weekStart: Date;
  weekEnd: Date;
  orderCutoff: Date;
}

export interface UpdateRotationInput {
  mealIds?: string[];
  status?: RotationStatus;
}

// Toronto timezone for cutoff calculations
const TORONTO_TIMEZONE = "America/Toronto";

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current instant (UTC)
 */
function getNow(): Date {
  return new Date();
}

/**
 * Convert a date to Toronto local time (for calculations)
 */
function toToronto(date: Date): Date {
  return toZonedTime(date, TORONTO_TIMEZONE);
}

/**
 * Convert a Toronto local time back to UTC
 */
function fromToronto(date: Date): Date {
  return fromZonedTime(date, TORONTO_TIMEZONE);
}

/**
 * Format a date in Toronto timezone
 */
function formatToronto(date: Date, formatStr: string): string {
  return formatInTimeZone(date, TORONTO_TIMEZONE, formatStr);
}

/**
 * Get Wednesday (start of week) for a given date.
 * Week runs Wednesday-Tuesday.
 */
function getWeekStart(date: Date): Date {
  const d = toToronto(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Calculate days to subtract to get to Wednesday
  // If it's Wednesday (3), stay. Otherwise go back to previous Wednesday.
  const daysToSubtract = (day - 3 + 7) % 7;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return fromToronto(d);
}

/**
 * Get Tuesday end of week (23:59:59).
 * Week runs Wednesday-Tuesday, so Tuesday is 6 days after Wednesday.
 */
function getWeekEnd(weekStart: Date): Date {
  const d = toToronto(weekStart);
  d.setDate(d.getDate() + 6); // Tuesday is 6 days after Wednesday
  d.setHours(23, 59, 59, 999);
  return fromToronto(d);
}

/**
 * Get order cutoff for a delivery week.
 * The cutoff is Tuesday 11:59 PM BEFORE the delivery week starts.
 *
 * Example: For delivery week starting Jan 14 (Wednesday),
 * the cutoff is Jan 13 (Tuesday) at 11:59 PM.
 */
function getOrderCutoff(deliveryWeekStart: Date): Date {
  const cutoff = toToronto(deliveryWeekStart);
  cutoff.setDate(cutoff.getDate() - 1); // Go back to Tuesday before Wednesday
  cutoff.setHours(23, 59, 59, 999);
  return fromToronto(cutoff);
}

/**
 * Get the ordering window for a delivery week.
 * Orders placed in Week N (Wed-Tue) are for Delivery Week N+1.
 * Range: [Wednesday 00:00, Following Wednesday 00:00)
 */
export function getOrderingWindowForDeliveryWeek(deliveryWeekStart: Date) {
  const weekStart = getWeekStart(deliveryWeekStart);
  const windowStartToronto = toToronto(weekStart);
  windowStartToronto.setDate(windowStartToronto.getDate() - 7);
  windowStartToronto.setHours(0, 0, 0, 0);
  const windowStart = fromToronto(windowStartToronto);
  const windowEnd = weekStart;

  return { windowStart, windowEnd };
}

/**
 * Get next Wednesday (start of next week)
 */
function getNextWeekStart(date: Date): Date {
  const weekStart = getWeekStart(date);
  const nextWeek = toToronto(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);
  return fromToronto(nextWeek);
}

/**
 * Get the delivery week that is currently open for ordering.
 * If the cutoff for next week has passed, move to the following week.
 */
function getOrderingWeekStart(date: Date): Date {
  const nextWeekStart = getNextWeekStart(date);
  const nextWeekCutoff = getOrderCutoff(nextWeekStart);

  if (date > nextWeekCutoff) {
    return getNextWeekStart(nextWeekStart);
  }

  return nextWeekStart;
}

// ============================================
// Weekly Rotation Service
// ============================================

export const weeklyRotationService = {
  /**
   * Get the rotation for THIS week's delivery (the week we're currently in).
   * Used by chef to see what to prepare this weekend.
   */
  async getCurrentRotation() {
    const now = getNow();

    console.log(
      `[RotationService] Getting current rotation for ${now.toISOString()}`,
    );

    // Find any published rotation where now is between weekStart and weekEnd
    const rotation = await prisma.weeklyRotation.findFirst({
      where: {
        status: "PUBLISHED",
        weekStart: { lte: now },
        weekEnd: { gte: now },
      },
      include: {
        meals: {
          include: {
            substitutionGroups: { include: { options: true } },
            modifierGroups: { include: { options: true } },
            tags: true,
          },
        },
      },
    });

    console.log(
      `[RotationService] Found current rotation: ${
        rotation ? rotation.id : "none"
      }, meals: ${rotation?.meals?.length ?? 0}`,
    );

    return rotation;
  },

  /**
   * Get the rotation that customers can currently ORDER from.
   *
   * Logic: Find the earliest published rotation where orderCutoff >= now.
   * This rotation represents the NEXT delivery week.
   *
   * Example: Today is Wed Jan 7
   * - We find rotation with weekStart=Jan 14, orderCutoff=Jan 13
   * - Customers ordering now will get delivery week Jan 14-20
   */
  async getOrderableRotation() {
    const now = getNow();
    const currentWeekStart = getWeekStart(now);
    const orderingWeekStart = getOrderingWeekStart(now);
    const orderingWeekCutoff = getOrderCutoff(orderingWeekStart);

    console.log(
      `[RotationService] Getting orderable rotation at ${formatToronto(now, "EEE MMM d h:mm a")}`,
    );

    // Only return the rotation for the current ordering week (week+1 or week+2 after cutoff)
    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: orderingWeekStart },
      include: {
        meals: {
          include: {
            substitutionGroups: { include: { options: true } },
            modifierGroups: { include: { options: true } },
            tags: true,
          },
        },
      },
    });

    if (!rotation || rotation.status !== "PUBLISHED") {
      console.log(
        `[RotationService] No published rotation found for ordering week ${orderingWeekStart.toISOString()}`,
      );
      return {
        rotation: null,
        currentWeekStart,
        deliveryWeekStart: null,
        deliveryWeekDisplay: null,
        orderCutoff: orderingWeekCutoff,
      };
    }

    const deliveryWeekStart = new Date(rotation.weekStart);
    const orderCutoff = new Date(rotation.orderCutoff);

    console.log(
      `[RotationService] Found orderable rotation: ${rotation.id}, ` +
        `delivery week: ${formatToronto(deliveryWeekStart, "MMM d")} - ${formatToronto(getWeekEnd(deliveryWeekStart), "MMM d")}, ` +
        `cutoff: ${formatToronto(orderCutoff, "EEE MMM d h:mm a")}`,
    );

    return {
      rotation,
      currentWeekStart,
      deliveryWeekStart,
      deliveryWeekDisplay: `${formatToronto(deliveryWeekStart, "MMM d")} - ${formatToronto(
        getWeekEnd(deliveryWeekStart),
        "MMM d",
      )}`,
      orderCutoff,
    };
  },

  /**
   * Get rotation by week start date.
   */
  async getRotationByWeek(weekStart: Date) {
    console.log(
      `[RotationService] Getting rotation for week starting ${weekStart.toISOString()}`,
    );

    return await prisma.weeklyRotation.findUnique({
      where: { weekStart },
      include: {
        meals: {
          include: {
            substitutionGroups: { include: { options: true } },
            modifierGroups: { include: { options: true } },
            tags: true,
          },
        },
      },
    });
  },

  /**
   * Get all rotations (for dashboard view).
   */
  async getAllRotations() {
    console.log(`[RotationService] Getting all rotations`);

    return await prisma.weeklyRotation.findMany({
      orderBy: { weekStart: "desc" },
      include: {
        meals: true,
        _count: { select: { meals: true } },
      },
    });
  },

  /**
   * Create a new rotation for a delivery week.
   *
   * - weekStart: Wednesday of the delivery week
   * - weekEnd: Tuesday of the delivery week
   * - orderCutoff: Tuesday BEFORE weekStart (last day to order)
   */
  async createRotation(weekStartDate: Date) {
    const weekStart = getWeekStart(weekStartDate);
    const weekEnd = getWeekEnd(weekStart);
    const orderCutoff = getOrderCutoff(weekStart);

    console.log(
      `[RotationService] Creating rotation for delivery week ${weekStart.toISOString()}, cutoff: ${orderCutoff.toISOString()}`,
    );

    return await prisma.weeklyRotation.create({
      data: {
        weekStart,
        weekEnd,
        orderCutoff,
        status: "DRAFT",
      },
      include: { meals: true },
    });
  },

  /**
   * Update rotation meals.
   */
  async updateRotationMeals(rotationId: string, mealIds: string[]) {
    console.log(
      `[RotationService] Updating rotation ${rotationId} with ${mealIds.length} meals`,
    );

    return await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: {
        meals: {
          set: mealIds.map((id) => ({ id })),
        },
      },
      include: { meals: true },
    });
  },

  /**
   * Publish a rotation (makes it visible to customers).
   */
  async publishRotation(rotationId: string) {
    console.log(`[RotationService] Publishing rotation ${rotationId}`);

    return await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "PUBLISHED" },
      include: { meals: true },
    });
  },

  /**
   * Archive a rotation.
   */
  async archiveRotation(rotationId: string) {
    console.log(`[RotationService] Archiving rotation ${rotationId}`);

    return await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "ARCHIVED" },
      include: { meals: true },
    });
  },

  /**
   * Unarchive a rotation (set back to PUBLISHED).
   */
  async unarchiveRotation(rotationId: string) {
    console.log(`[RotationService] Unarchiving rotation ${rotationId}`);

    return await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "PUBLISHED" },
      include: { meals: true },
    });
  },

  /**
   * Check if ordering is still open (before Tuesday 11:59 PM Toronto).
   */
  async isOrderingOpen(): Promise<boolean> {
    const rotation = await this.getCurrentRotation();
    if (!rotation) return false;

    const now = getNow();
    return now < rotation.orderCutoff;
  },

  /**
   * Get all available meals for ordering:
   * - All SIGNATURE type meals (always available)
   * - Plus ROTATING meals from the orderable rotation
   *
   * Returns information about which week customers are ordering for.
   */
  async getAvailableMeals() {
    console.log(`[RotationService] Getting available meals`);

    // Get all signature meals (always available)
    const signatureMeals = await prisma.meal.findMany({
      where: {
        mealType: "SIGNATURE",
        isActive: true,
      },
      include: {
        substitutionGroups: { include: { options: true } },
        modifierGroups: { include: { options: true } },
        tags: true,
      },
    });

    const now = getNow();
    const currentWeekStart = getWeekStart(now);
    const fallbackDeliveryWeekStart = getOrderingWeekStart(now);
    const fallbackDeliveryWeekDisplay = `${formatToronto(
      fallbackDeliveryWeekStart,
      "MMM d",
    )} - ${formatToronto(getWeekEnd(fallbackDeliveryWeekStart), "MMM d")}`;
    const fallbackOrderCutoff = getOrderCutoff(fallbackDeliveryWeekStart);

    // Get the orderable rotation (published rotation meals, if any)
    const orderableData = await this.getOrderableRotation();
    const { rotation, deliveryWeekStart, deliveryWeekDisplay, orderCutoff } =
      orderableData;
    const rotationMeals = rotation?.meals || [];

    // Ordering is always open for signature meals; rotating meals require publish
    const isOrderingOpen = true;
    const resolvedDeliveryWeekStart =
      deliveryWeekStart || fallbackDeliveryWeekStart;
    const resolvedDeliveryWeekDisplay =
      deliveryWeekDisplay || fallbackDeliveryWeekDisplay;
    const resolvedOrderCutoff = orderCutoff || fallbackOrderCutoff;

    console.log(
      `[RotationService] Returning ${signatureMeals.length} signature + ${rotationMeals.length} rotation meals` +
        (deliveryWeekDisplay
          ? ` for ${deliveryWeekDisplay}`
          : " (no rotation available)"),
    );

    return {
      meals: [...signatureMeals, ...rotationMeals],
      signatureMeals,
      rotationMeals,
      isOrderingOpen,
      // Info about which week this is for
      currentWeekDisplay: `${formatToronto(currentWeekStart, "MMM d")} - ${formatToronto(
        getWeekEnd(currentWeekStart),
        "MMM d",
      )}`,
      deliveryWeekDisplay: resolvedDeliveryWeekDisplay,
      deliveryWeekStart: formatToronto(
        resolvedDeliveryWeekStart,
        "MMM d, yyyy",
      ),
      cutoffTime: resolvedOrderCutoff,
    };
  },

  /**
   * Get or create the rotation used to group orders for the next delivery week.
   * This does NOT require the rotation to be published.
   */
  async getOrCreateOrderingRotation() {
    const now = getNow();
    const deliveryWeekStart = getOrderingWeekStart(now);

    let rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: deliveryWeekStart },
      include: { meals: true },
    });

    if (!rotation) {
      rotation = await this.createRotation(deliveryWeekStart);
    }

    const orderCutoff = new Date(rotation.orderCutoff);

    return {
      rotation,
      deliveryWeekStart: new Date(rotation.weekStart),
      deliveryWeekEnd: new Date(rotation.weekEnd),
      orderCutoff,
    };
  },

  /**
   * Get rotating meals (for meal management).
   */
  async getRotatingMeals() {
    return await prisma.meal.findMany({
      where: { mealType: "ROTATING" },
      include: { tags: true },
    });
  },

  /**
   * Check if next week's rotation needs attention.
   * Returns warning if within 3 days of current week ending and no rotation exists.
   */
  async checkNextWeekWarning(): Promise<{
    needsAttention: boolean;
    message?: string;
  }> {
    const now = getNow();
    const currentWeekStart = getWeekStart(now);
    const nextWeekStart = getNextWeekStart(currentWeekStart);

    // Check if we're within 3 days of the week ending
    const currentWeekEnd = getWeekEnd(currentWeekStart);
    const daysUntilWeekEnd = Math.ceil(
      (currentWeekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWeekEnd > 3) {
      return { needsAttention: false };
    }

    // Check if next week has a published rotation
    const nextRotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: nextWeekStart },
    });

    if (!nextRotation) {
      return {
        needsAttention: true,
        message: `No rotation created for next week (starting ${formatToronto(nextWeekStart, "MMM d, yyyy")})`,
      };
    }

    if (nextRotation.status !== "PUBLISHED") {
      return {
        needsAttention: true,
        message: `Next week's rotation is in ${nextRotation.status} status - needs to be published`,
      };
    }

    return { needsAttention: false };
  },
};
