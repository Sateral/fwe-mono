/**
 * Weekly Rotation Service
 *
 * Manages the meal rotation system: fulfillment cycles (Thu-Wed),
 * ordering windows, and bi-weekly rotation periods that share a menu.
 *
 * Organized into:
 * - Helpers & Prisma includes
 * - Private utilities (period resolution, effective-meal normalization)
 * - Storefront queries (customer-facing: available meals, orderable rotation)
 * - Admin CRUD (create, archive, update meals)
 * - Period management (bi-weekly grouping of rotations)
 */

import { RotationStatus } from "@fwe/db";

import prisma from "../prisma";
import {
  DEFAULT_ROTATION_ANCHOR_FULFILLMENT_START,
  formatBusinessTime,
  getOrderingWindowForDeliveryWeek,
  resolveFulfillmentCycleEnd,
  resolveFulfillmentCycleStart,
  resolveOrderCutoff,
  resolveOrderableFulfillmentCycleStart,
  resolveRotationPeriodKey,
  resolveRotationPeriodStartFromAnchor,
  shiftFulfillmentCycle,
} from "./rotation-schedule";

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

// ============================================
// Prisma Includes
// ============================================

/** Full meal details (substitutions, modifiers, tags) for storefront display. */
const detailedMealInclude = {
  substitutionGroups: { include: { options: true } },
  modifierGroups: { include: { options: true } },
  tags: true,
} as const;

/** Rotation with full meal details — used for storefront/menu queries. */
const detailedRotationInclude = {
  meals: {
    include: detailedMealInclude,
  },
  rotationPeriod: {
    include: {
      meals: {
        include: detailedMealInclude,
      },
    },
  },
} as const;

/** Rotation with meal IDs only — used for admin lists and counts. */
const summaryRotationInclude = {
  meals: true,
  rotationPeriod: {
    include: {
      meals: true,
    },
  },
  _count: { select: { meals: true } },
} as const;

type RotationWithEffectiveMeals = {
  meals: unknown[];
  rotationPeriod?: { meals: unknown[] } | null;
  _count?: { meals: number };
};

// ============================================
// Helpers
// ============================================

/** Wrapper for `new Date()` — allows vitest to mock time via `vi.useFakeTimers()`. */
function getNow(): Date {
  return new Date();
}

/** Format a fulfillment cycle as "MMM d - MMM d" for display. */
function buildFulfillmentCycleDisplay(
  cycleStart: Date,
  cycleEnd?: Date,
): string {
  const resolvedEnd = cycleEnd ?? resolveFulfillmentCycleEnd(cycleStart);

  return `${formatBusinessTime(cycleStart, "MMM d")} - ${formatBusinessTime(
    resolvedEnd,
    "MMM d",
  )}`;
}

/** ARCHIVED rotations are hidden from the storefront menu. */
function isRotationOnMenu(rotation: { status: RotationStatus }) {
  return rotation.status !== "ARCHIVED";
}

/**
 * Normalize meal source: period menu wins when it has entries (bi-weekly shared menu).
 * If the period exists but has no meals yet, use the rotation's direct meal list so legacy
 * data or partial CMS writes still surface on the storefront.
 */
function withEffectiveMeals<T extends RotationWithEffectiveMeals>(
  rotation: T,
): T {
  const periodMeals = rotation.rotationPeriod?.meals;
  const directMeals = rotation.meals;
  const effectiveMeals = rotation.rotationPeriod
    ? (Array.isArray(periodMeals) && periodMeals.length > 0
        ? periodMeals
        : Array.isArray(directMeals)
          ? directMeals
          : [])
    : Array.isArray(directMeals)
      ? directMeals
      : [];

  return {
    ...rotation,
    meals: effectiveMeals,
    _count: rotation._count
      ? {
          ...rotation._count,
          meals: effectiveMeals.length,
        }
      : rotation._count,
  };
}

// ============================================
// Private Utilities — Rotation Period Resolution
// ============================================

async function getRotationPeriodByKey(key: string) {
  return prisma.rotationPeriod.findUnique({ where: { key } });
}

/** Earliest non-archived period / rotation; drives 2-cycle grouping keys. */
async function getRotationPeriodAnchorFulfillmentStart(): Promise<Date | null> {
  const firstPeriod = await prisma.rotationPeriod.findFirst({
    where: { status: { not: "ARCHIVED" } },
    include: {
      rotations: {
        select: { weekStart: true },
        orderBy: { weekStart: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const fromPeriod = firstPeriod?.rotations[0]?.weekStart;
  if (fromPeriod) {
    return resolveFulfillmentCycleStart(fromPeriod);
  }

  const firstRotation = await prisma.weeklyRotation.findFirst({
    where: {
      rotationPeriodId: { not: null },
      status: { not: "ARCHIVED" },
    },
    select: { weekStart: true },
    orderBy: { weekStart: "asc" },
  });

  if (firstRotation?.weekStart) {
    return resolveFulfillmentCycleStart(firstRotation.weekStart);
  }

  return null;
}

async function resolveRotationPeriodKeyForWeek(
  weekStart: Date,
): Promise<string> {
  const normalized = resolveFulfillmentCycleStart(weekStart);
  const anchor =
    (await getRotationPeriodAnchorFulfillmentStart()) ??
    DEFAULT_ROTATION_ANCHOR_FULFILLMENT_START;
  const periodStart = resolveRotationPeriodStartFromAnchor(normalized, anchor);

  return resolveRotationPeriodKey(periodStart, periodStart);
}

async function getOrCreateRotationPeriodForWeek(weekStart: Date) {
  const key = await resolveRotationPeriodKeyForWeek(weekStart);
  const existing = await getRotationPeriodByKey(key);

  if (existing) {
    return existing;
  }

  return prisma.rotationPeriod.create({
    data: {
      key,
      name: key,
      status: "DRAFT",
    },
  });
}

async function ensureRotationPeriodForRotation(rotationId: string) {
  const rotation = await prisma.weeklyRotation.findUnique({
    where: { id: rotationId },
    select: {
      id: true,
      weekStart: true,
      rotationPeriodId: true,
    },
  });

  if (!rotation) {
    throw new Error(`Rotation ${rotationId} not found`);
  }

  if (rotation.rotationPeriodId) {
    return {
      rotation,
      rotationPeriodId: rotation.rotationPeriodId,
    };
  }

  const rotationPeriod = await getOrCreateRotationPeriodForWeek(
    rotation.weekStart,
  );

  await prisma.weeklyRotation.update({
    where: { id: rotation.id },
    data: { rotationPeriodId: rotationPeriod.id },
  });

  return {
    rotation,
    rotationPeriodId: rotationPeriod.id,
  };
}

// Re-exports for consumers that import from this module.
export const getOrderCutoff = resolveOrderCutoff;
export { getOrderingWindowForDeliveryWeek };

export const weeklyRotationService = {
  // ============================================
  // Storefront Queries
  // ============================================

  /**
   * The rotation for the *current calendar week* (the cycle we are inside right now).
   * Used to show "This week's menu" on the storefront.
   *
   * Compare with `getOrderableRotation` (next week's cycle that customers order *into*).
   */
  async getCurrentRotation() {
    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);

    console.log(
      `[RotationService] Getting current rotation for ${now.toISOString()}`,
    );

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: currentFulfillmentStart },
      include: detailedRotationInclude,
    });

    const currentRotation =
      rotation && isRotationOnMenu(rotation)
        ? withEffectiveMeals(rotation)
        : null;

    console.log(
      `[RotationService] Found current rotation: ${
        currentRotation ? currentRotation.id : "none"
      }, meals: ${currentRotation?.meals?.length ?? 0}`,
    );

    return currentRotation;
  },

  /**
   * The fulfillment cycle customers order into (`resolveOrderableFulfillmentCycleStart`).
   * Returns the rotation row used for that cycle's menu plus delivery metadata.
   *
   * Looks up `WeeklyRotation` in order: orderable Thursday, calendar-current Thursday,
   * then the prior fulfillment Thursday. Menus live on `RotationPeriod`; often only one
   * of the two weekly rows exists after setup, and when target === current a single
   * missing row would otherwise skip the sibling fallback entirely.
   */
  async getOrderableRotation() {
    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);
    const targetCycleStart = resolveOrderableFulfillmentCycleStart(now);
    const fallbackCutoff = resolveOrderCutoff(targetCycleStart);

    console.log(
      `[RotationService] Getting orderable rotation at ${formatBusinessTime(
        now,
        "EEE MMM d h:mm a",
      )}`,
    );

    const candidateWeekStarts: Date[] = [];
    const seenWeek = new Set<number>();
    const pushCandidate = (d: Date) => {
      const normalized = resolveFulfillmentCycleStart(d);
      const t = normalized.getTime();
      if (seenWeek.has(t)) return;
      seenWeek.add(t);
      candidateWeekStarts.push(normalized);
    };

    pushCandidate(targetCycleStart);
    pushCandidate(currentFulfillmentStart);
    pushCandidate(shiftFulfillmentCycle(targetCycleStart, -1));
    pushCandidate(shiftFulfillmentCycle(currentFulfillmentStart, -1));

    let rotation = null;
    for (const weekStart of candidateWeekStarts) {
      const row = await prisma.weeklyRotation.findUnique({
        where: { weekStart },
        include: detailedRotationInclude,
      });
      if (row && isRotationOnMenu(row)) {
        rotation = row;
        break;
      }
    }

    if (!rotation || !isRotationOnMenu(rotation)) {
      console.log(
        `[RotationService] No on-menu rotation for fulfillment cycle ${targetCycleStart.toISOString()}`,
      );

      return {
        rotation: null,
        currentWeekStart: currentFulfillmentStart,
        deliveryWeekStart: null,
        deliveryWeekDisplay: null,
        orderCutoff: fallbackCutoff,
      };
    }

    const normalizedRotation = withEffectiveMeals(rotation);
    const rotationCycleStart = resolveFulfillmentCycleStart(rotation.weekStart);
    const sameCycleAsOrderableTarget =
      rotationCycleStart.getTime() === targetCycleStart.getTime();
    const orderCutoff = sameCycleAsOrderableTarget
      ? new Date(rotation.orderCutoff)
      : resolveOrderCutoff(targetCycleStart);
    const deliveryWeekEnd = resolveFulfillmentCycleEnd(targetCycleStart);

    console.log(
      `[RotationService] Found orderable rotation: ${normalizedRotation.id}, ` +
        `fulfillment: ${buildFulfillmentCycleDisplay(targetCycleStart, deliveryWeekEnd)}, ` +
        `cutoff: ${formatBusinessTime(orderCutoff, "EEE MMM d h:mm a")}` +
        (sameCycleAsOrderableTarget ? "" : " (menu row from sibling cycle)"),
    );

    return {
      rotation: normalizedRotation,
      currentWeekStart: currentFulfillmentStart,
      deliveryWeekStart: targetCycleStart,
      deliveryWeekDisplay: buildFulfillmentCycleDisplay(
        targetCycleStart,
        deliveryWeekEnd,
      ),
      orderCutoff,
    };
  },

  /** Fetch a specific rotation by its fulfillment-cycle start date. */
  async getRotationByWeek(weekStart: Date) {
    const normalized = resolveFulfillmentCycleStart(weekStart);

    console.log(
      `[RotationService] Getting rotation for cycle starting ${normalized.toISOString()}`,
    );

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: normalized },
      include: detailedRotationInclude,
    });

    return rotation ? withEffectiveMeals(rotation) : null;
  },

  // ============================================
  // Admin CRUD
  // ============================================

  /** All rotations (admin list view, newest first). */
  async getAllRotations() {
    console.log(`[RotationService] Getting all rotations`);

    const rotations = await prisma.weeklyRotation.findMany({
      orderBy: { weekStart: "desc" },
      include: summaryRotationInclude,
    });

    return rotations.map((rotation) => withEffectiveMeals(rotation));
  },

  /** Create a new rotation for a given week. Automatically links to a rotation period. */
  async createRotation(weekStartDate: Date) {
    const weekStart = resolveFulfillmentCycleStart(weekStartDate);
    const weekEnd = resolveFulfillmentCycleEnd(weekStart);
    const orderCutoff = resolveOrderCutoff(weekStart);
    const rotationPeriod = await getOrCreateRotationPeriodForWeek(weekStart);

    console.log(
      `[RotationService] Creating rotation for fulfillment cycle ${weekStart.toISOString()}, cutoff: ${orderCutoff.toISOString()}`,
    );

    const rotation = await prisma.weeklyRotation.create({
      data: {
        weekStart,
        weekEnd,
        orderCutoff,
        status: "DRAFT",
        rotationPeriodId: rotationPeriod.id,
      },
      include: summaryRotationInclude,
    });

    return withEffectiveMeals(rotation);
  },

  /** Set the meal list for a rotation (actually updates the parent period's meals). */
  async updateRotationMeals(rotationId: string, mealIds: string[]) {
    console.log(
      `[RotationService] Updating rotation ${rotationId} with ${mealIds.length} meals`,
    );

    const { rotationPeriodId } =
      await ensureRotationPeriodForRotation(rotationId);

    await prisma.rotationPeriod.update({
      where: { id: rotationPeriodId },
      data: {
        meals: {
          set: mealIds.map((id) => ({ id })),
        },
      },
    });

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { id: rotationId },
      include: summaryRotationInclude,
    });

    if (!rotation) {
      throw new Error(`Rotation ${rotationId} not found after meal update`);
    }

    return withEffectiveMeals(rotation);
  },

  async archiveRotation(rotationId: string) {
    console.log(`[RotationService] Archiving rotation ${rotationId}`);

    const { rotationPeriodId } =
      await ensureRotationPeriodForRotation(rotationId);

    await prisma.rotationPeriod.update({
      where: { id: rotationPeriodId },
      data: { status: "ARCHIVED" },
    });

    await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "ARCHIVED" },
    });

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { id: rotationId },
      include: summaryRotationInclude,
    });

    if (!rotation) {
      throw new Error(`Rotation ${rotationId} not found after archive`);
    }

    return withEffectiveMeals(rotation);
  },

  async unarchiveRotation(rotationId: string) {
    console.log(`[RotationService] Unarchiving rotation ${rotationId}`);

    const { rotationPeriodId } =
      await ensureRotationPeriodForRotation(rotationId);

    await prisma.rotationPeriod.update({
      where: { id: rotationPeriodId },
      data: { status: "DRAFT" },
    });

    await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "DRAFT" },
    });

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { id: rotationId },
      include: summaryRotationInclude,
    });

    if (!rotation) {
      throw new Error(`Rotation ${rotationId} not found after unarchive`);
    }

    return withEffectiveMeals(rotation);
  },

  async isOrderingOpen(): Promise<boolean> {
    const now = getNow();
    const window = getOrderingWindowForDeliveryWeek(
      resolveOrderableFulfillmentCycleStart(now),
    );

    return now >= window.windowStart && now < window.windowEnd;
  },

  /**
   * Public-API endpoint for the storefront menu page.
   *
   * Wraps `getOrderableRotation`, then:
   * - Filters to active meals only.
   * - Adds the `isOrderingOpen` flag.
   * - Adds display strings for the current / delivery week.
   * - Falls back to computed dates if no rotation row exists yet.
   *
   * Compare with `getOrderableRotation` (raw rotation + metadata, no filtering).
   */
  async getAvailableMeals() {
    console.log(`[RotationService] Getting available meals`);

    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);
    const fallbackTargetCycle = resolveOrderableFulfillmentCycleStart(now);
    const fallbackEnd = resolveFulfillmentCycleEnd(fallbackTargetCycle);
    const fallbackOrderCutoff = resolveOrderCutoff(fallbackTargetCycle);
    const orderableData = await this.getOrderableRotation();
    const { rotation, deliveryWeekStart, deliveryWeekDisplay, orderCutoff } =
      orderableData;

    const isMenuMeal = (meal: { isActive?: boolean | null }) =>
      meal.isActive !== false;

    type MenuMealRow = Awaited<
      ReturnType<
        typeof prisma.meal.findMany<{ include: typeof detailedMealInclude }>
      >
    >[number];

    let meals: MenuMealRow[] = (rotation?.meals || []).filter(isMenuMeal);

    if (meals.length === 0 && rotation?.rotationPeriodId) {
      meals = await prisma.meal.findMany({
        where: {
          rotationPeriods: { some: { id: rotation.rotationPeriodId } },
        },
        include: detailedMealInclude,
        orderBy: { name: "asc" },
      });
      meals = meals.filter(isMenuMeal);
    }

    if (meals.length === 0 && rotation?.rotationPeriodId) {
      const siblings = await prisma.weeklyRotation.findMany({
        where: { rotationPeriodId: rotation.rotationPeriodId },
        include: { meals: { include: detailedMealInclude } },
      });
      const byId = new Map<string, MenuMealRow>();
      for (const wr of siblings) {
        for (const m of wr.meals) {
          if (isMenuMeal(m)) byId.set(m.id, m);
        }
      }
      meals = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    if (meals.length === 0 && rotation) {
      const periodKey = await resolveRotationPeriodKeyForWeek(
        rotation.weekStart,
      );
      const periodForKey = await prisma.rotationPeriod.findFirst({
        where: { key: periodKey, status: { not: "ARCHIVED" } },
        include: {
          meals: { include: detailedMealInclude },
        },
      });
      if (periodForKey?.meals?.length) {
        meals = periodForKey.meals.filter(isMenuMeal);
        if (periodForKey.id !== rotation.rotationPeriodId) {
          console.warn(
            `[RotationService] WeeklyRotation ${rotation.id} had rotationPeriodId=${rotation.rotationPeriodId} (0 menu meals) but period key=${periodKey} (${periodForKey.id}) has ${meals.length} meals. Re-linking to canonical period.`,
          );
          await prisma.weeklyRotation.update({
            where: { id: rotation.id },
            data: { rotationPeriodId: periodForKey.id },
          });
        }
      }
    }

    const resolvedDeliveryWeekStart =
      deliveryWeekStart || fallbackTargetCycle;
    const resolvedDeliveryWeekDisplay =
      deliveryWeekDisplay ||
      buildFulfillmentCycleDisplay(fallbackTargetCycle, fallbackEnd);
    const resolvedOrderCutoff = orderCutoff || fallbackOrderCutoff;

    console.log(
      `[RotationService] Returning ${meals.length} menu meals` +
        (deliveryWeekDisplay
          ? ` for ${deliveryWeekDisplay}`
          : " (no rotation row)"),
    );

    return {
      meals,
      isOrderingOpen: await this.isOrderingOpen(),
      currentWeekDisplay: buildFulfillmentCycleDisplay(currentFulfillmentStart),
      deliveryWeekDisplay: resolvedDeliveryWeekDisplay,
      deliveryWeekStart: formatBusinessTime(
        resolvedDeliveryWeekStart,
        "MMM d, yyyy",
      ),
      cutoffTime: resolvedOrderCutoff,
    };
  },

  /**
   * Ensure a `WeeklyRotation` row exists for the current orderable cycle.
   * Used by the order service as a fallback when a rotation is referenced
   * but doesn't exist yet (e.g. admin hasn't created next week's rotation).
   *
   * Compare with `getOrderableRotation` (read-only, returns null if missing).
   */
  async getOrCreateOrderingRotation() {
    const now = getNow();
    const deliveryWeekStart = resolveOrderableFulfillmentCycleStart(now);

    let rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: deliveryWeekStart },
      include: summaryRotationInclude,
    });

    if (!rotation) {
      rotation = await this.createRotation(deliveryWeekStart);
    } else if (!rotation.rotationPeriod) {
      await ensureRotationPeriodForRotation(rotation.id);
      const refreshedRotation = await prisma.weeklyRotation.findUnique({
        where: { id: rotation.id },
        include: summaryRotationInclude,
      });

      if (refreshedRotation) {
        rotation = refreshedRotation;
      }
    }

    return {
      rotation: withEffectiveMeals(rotation),
      deliveryWeekStart: new Date(rotation.weekStart),
      deliveryWeekEnd: new Date(rotation.weekEnd),
      orderCutoff: new Date(rotation.orderCutoff),
    };
  },

  /** All active meals (for admin meal picker, sorted by last updated). */
  async getMenuMeals() {
    return await prisma.meal.findMany({
      where: { isActive: true },
      include: { tags: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  /** All active meals (for rotation period editor, sorted alphabetically). */
  async getRotatingMeals() {
    return await prisma.meal.findMany({
      where: { isActive: true },
      include: { tags: true },
      orderBy: { name: "asc" },
    });
  },

  // ============================================
  // Period Management (bi-weekly grouping)
  // ============================================

  /**
   * Get the current and next rotation periods (non-archived).
   * Used by the admin dashboard to manage bi-weekly menu cycles.
   */
  async getRotationPeriods() {
    console.log(`[RotationService] Getting rotation periods`);

    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);

    const anchor =
      (await getRotationPeriodAnchorFulfillmentStart()) ??
      DEFAULT_ROTATION_ANCHOR_FULFILLMENT_START;
    const currentPeriodStart = resolveRotationPeriodStartFromAnchor(
      currentFulfillmentStart,
      anchor,
    );
    const currentPeriodKey = resolveRotationPeriodKey(
      currentPeriodStart,
      currentPeriodStart,
    );
    const nextPeriodStart = shiftFulfillmentCycle(currentPeriodStart, 2);
    const nextPeriodKey = resolveRotationPeriodKey(
      nextPeriodStart,
      nextPeriodStart,
    );

    const periods = await prisma.rotationPeriod.findMany({
      where: {
        status: { not: "ARCHIVED" },
        key: { in: [currentPeriodKey, nextPeriodKey] },
      },
      include: {
        meals: {
          include: {
            tags: true,
          },
        },
        rotations: {
          orderBy: { weekStart: "asc" },
          select: {
            id: true,
            weekStart: true,
            weekEnd: true,
            orderCutoff: true,
            status: true,
          },
        },
      },
      orderBy: { key: "asc" },
    });

    return {
      periods,
      currentPeriodKey,
      currentWeekStart: currentFulfillmentStart,
      anchorWeekStart: anchor,
    };
  },

  async getOrCreateCurrentRotationPeriod() {
    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);

    return await getOrCreateRotationPeriodForWeek(currentFulfillmentStart);
  },

  async getOrCreateNextRotationPeriod() {
    const now = getNow();
    const currentFulfillmentStart = resolveFulfillmentCycleStart(now);
    const anchor =
      (await getRotationPeriodAnchorFulfillmentStart()) ??
      DEFAULT_ROTATION_ANCHOR_FULFILLMENT_START;
    const currentPeriodStart = resolveRotationPeriodStartFromAnchor(
      currentFulfillmentStart,
      anchor,
    );
    const nextPeriodStart = shiftFulfillmentCycle(currentPeriodStart, 2);

    return await getOrCreateRotationPeriodForWeek(nextPeriodStart);
  },

  async createRotationPeriodWithWeeks(periodStartDate: Date) {
    const periodStart = resolveFulfillmentCycleStart(periodStartDate);
    const period = await getOrCreateRotationPeriodForWeek(periodStart);

    const week1Start = periodStart;
    const week2Start = shiftFulfillmentCycle(periodStart, 1);

    let rotation1 = await prisma.weeklyRotation.findUnique({
      where: { weekStart: week1Start },
    });

    let rotation2 = await prisma.weeklyRotation.findUnique({
      where: { weekStart: week2Start },
    });

    if (!rotation1) {
      rotation1 = await prisma.weeklyRotation.create({
        data: {
          weekStart: week1Start,
          weekEnd: resolveFulfillmentCycleEnd(week1Start),
          orderCutoff: resolveOrderCutoff(week1Start),
          status: "DRAFT",
          rotationPeriodId: period.id,
        },
      });
    } else if (!rotation1.rotationPeriodId) {
      await prisma.weeklyRotation.update({
        where: { id: rotation1.id },
        data: { rotationPeriodId: period.id },
      });
    }

    if (!rotation2) {
      rotation2 = await prisma.weeklyRotation.create({
        data: {
          weekStart: week2Start,
          weekEnd: resolveFulfillmentCycleEnd(week2Start),
          orderCutoff: resolveOrderCutoff(week2Start),
          status: "DRAFT",
          rotationPeriodId: period.id,
        },
      });
    } else if (!rotation2.rotationPeriodId) {
      await prisma.weeklyRotation.update({
        where: { id: rotation2.id },
        data: { rotationPeriodId: period.id },
      });
    }

    return await prisma.rotationPeriod.findUnique({
      where: { id: period.id },
      include: {
        meals: { include: { tags: true } },
        rotations: {
          orderBy: { weekStart: "asc" },
          select: {
            id: true,
            weekStart: true,
            weekEnd: true,
            orderCutoff: true,
            status: true,
          },
        },
      },
    });
  },

  async updateRotationPeriodMeals(periodId: string, mealIds: string[]) {
    console.log(
      `[RotationService] Updating period ${periodId} with ${mealIds.length} meals`,
    );

    await prisma.rotationPeriod.update({
      where: { id: periodId },
      data: {
        meals: {
          set: mealIds.map((id) => ({ id })),
        },
      },
    });

    return await prisma.rotationPeriod.findUnique({
      where: { id: periodId },
      include: {
        meals: { include: { tags: true } },
        rotations: {
          orderBy: { weekStart: "asc" },
          select: {
            id: true,
            weekStart: true,
            weekEnd: true,
            orderCutoff: true,
            status: true,
          },
        },
      },
    });
  },

  // ============================================
  // Admin Warnings
  // ============================================

  /** Returns a warning if the next fulfillment cycle has no rotation or no meals. */
  async checkNextWeekWarning(): Promise<{
    needsAttention: boolean;
    message?: string;
  }> {
    const now = getNow();
    const currentFulfillment = resolveFulfillmentCycleStart(now);
    const currentEnd = resolveFulfillmentCycleEnd(currentFulfillment);
    const daysUntilEnd = Math.ceil(
      (currentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilEnd > 3) {
      return { needsAttention: false };
    }

    const nextCycleStart = shiftFulfillmentCycle(currentFulfillment, 1);
    const nextRotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: nextCycleStart },
      include: {
        rotationPeriod: {
          include: {
            meals: { select: { id: true } },
          },
        },
      },
    });

    if (!nextRotation) {
      return {
        needsAttention: true,
        message: `No rotation row for next fulfillment cycle (starts ${formatBusinessTime(nextCycleStart, "MMM d, yyyy")})`,
      };
    }

    const mealCount = nextRotation.rotationPeriod?.meals?.length ?? 0;
    if (mealCount === 0) {
      return {
        needsAttention: true,
        message:
          "Next fulfillment cycle has no meals on its rotation period — add meals in Rotations.",
      };
    }

    return { needsAttention: false };
  },
};
