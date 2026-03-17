import { RotationStatus } from "@fwe/db";

import prisma from "../prisma";
import {
  formatBusinessTime,
  getOrderingWindowForDeliveryWeek,
  resolveDeliveryWeekEnd,
  resolveDeliveryWeekStart,
  resolveOrderCutoff,
  resolveOrderableWeekStart,
  resolveRotationPeriodKey,
  shiftDeliveryWeek,
} from "./rotation-schedule";

export interface CreateRotationInput {
  weekStart: Date;
  weekEnd: Date;
  orderCutoff: Date;
}

export interface UpdateRotationInput {
  mealIds?: string[];
  status?: RotationStatus;
}

const detailedMealInclude = {
  substitutionGroups: { include: { options: true } },
  modifierGroups: { include: { options: true } },
  tags: true,
} as const;

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

function getNow(): Date {
  return new Date();
}

function buildDeliveryWeekDisplay(weekStart: Date, weekEnd?: Date): string {
  const resolvedWeekEnd = weekEnd ?? resolveDeliveryWeekEnd(weekStart);

  return `${formatBusinessTime(weekStart, "MMM d")} - ${formatBusinessTime(
    resolvedWeekEnd,
    "MMM d",
  )}`;
}

function getRotationPeriodKey(weekStart: Date): string {
  return resolveRotationPeriodKey(weekStart);
}

function isRotationVisible(rotation: { status: RotationStatus }) {
  return rotation.status === "PUBLISHED";
}

function withEffectiveMeals<T extends RotationWithEffectiveMeals>(rotation: T): T {
  const effectiveMeals = rotation.rotationPeriod
    ? rotation.rotationPeriod.meals
    : rotation.meals;

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

async function getRotationPeriodByKey(key: string) {
  return prisma.rotationPeriod.findUnique({ where: { key } });
}

async function getOrCreateRotationPeriodForWeek(weekStart: Date) {
  const key = getRotationPeriodKey(weekStart);
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

  const rotationPeriod = await getOrCreateRotationPeriodForWeek(rotation.weekStart);

  await prisma.weeklyRotation.update({
    where: { id: rotation.id },
    data: { rotationPeriodId: rotationPeriod.id },
  });

  return {
    rotation,
    rotationPeriodId: rotationPeriod.id,
  };
}

export const getOrderCutoff = resolveOrderCutoff;
export { getOrderingWindowForDeliveryWeek };

export const weeklyRotationService = {
  async getCurrentRotation() {
    const now = getNow();
    const currentWeekStart = resolveDeliveryWeekStart(now);

    console.log(
      `[RotationService] Getting current rotation for ${now.toISOString()}`,
    );

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: currentWeekStart },
      include: detailedRotationInclude,
    });

    const currentRotation =
      rotation && isRotationVisible(rotation) ? withEffectiveMeals(rotation) : null;

    console.log(
      `[RotationService] Found current rotation: ${
        currentRotation ? currentRotation.id : "none"
      }, meals: ${currentRotation?.meals?.length ?? 0}`,
    );

    return currentRotation;
  },

  async getOrderableRotation() {
    const now = getNow();
    const currentWeekStart = resolveDeliveryWeekStart(now);
    const deliveryWeekStart = resolveOrderableWeekStart(now);
    const fallbackCutoff = resolveOrderCutoff(deliveryWeekStart);

    console.log(
      `[RotationService] Getting orderable rotation at ${formatBusinessTime(
        now,
        "EEE MMM d h:mm a",
      )}`,
    );

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: deliveryWeekStart },
      include: detailedRotationInclude,
    });

    if (!rotation || !isRotationVisible(rotation)) {
      console.log(
        `[RotationService] No published rotation found for ordering week ${deliveryWeekStart.toISOString()}`,
      );

      return {
        rotation: null,
        currentWeekStart,
        deliveryWeekStart: null,
        deliveryWeekDisplay: null,
        orderCutoff: fallbackCutoff,
      };
    }

    const normalizedRotation = withEffectiveMeals(rotation);
    const orderCutoff = new Date(rotation.orderCutoff);
    const deliveryWeekEnd = resolveDeliveryWeekEnd(deliveryWeekStart);

    console.log(
      `[RotationService] Found orderable rotation: ${normalizedRotation.id}, ` +
        `delivery week: ${buildDeliveryWeekDisplay(deliveryWeekStart, deliveryWeekEnd)}, ` +
        `cutoff: ${formatBusinessTime(orderCutoff, "EEE MMM d h:mm a")}`,
    );

    return {
      rotation: normalizedRotation,
      currentWeekStart,
      deliveryWeekStart,
      deliveryWeekDisplay: buildDeliveryWeekDisplay(
        deliveryWeekStart,
        deliveryWeekEnd,
      ),
      orderCutoff,
    };
  },

  async getRotationByWeek(weekStart: Date) {
    const normalizedWeekStart = resolveDeliveryWeekStart(weekStart);

    console.log(
      `[RotationService] Getting rotation for week starting ${normalizedWeekStart.toISOString()}`,
    );

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: normalizedWeekStart },
      include: detailedRotationInclude,
    });

    return rotation ? withEffectiveMeals(rotation) : null;
  },

  async getAllRotations() {
    console.log(`[RotationService] Getting all rotations`);

    const rotations = await prisma.weeklyRotation.findMany({
      orderBy: { weekStart: "desc" },
      include: summaryRotationInclude,
    });

    return rotations.map((rotation) => withEffectiveMeals(rotation));
  },

  async createRotation(weekStartDate: Date) {
    const weekStart = resolveDeliveryWeekStart(weekStartDate);
    const weekEnd = resolveDeliveryWeekEnd(weekStart);
    const orderCutoff = resolveOrderCutoff(weekStart);
    const rotationPeriod = await getOrCreateRotationPeriodForWeek(weekStart);

    console.log(
      `[RotationService] Creating rotation for delivery week ${weekStart.toISOString()}, cutoff: ${orderCutoff.toISOString()}`,
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

  async updateRotationMeals(rotationId: string, mealIds: string[]) {
    console.log(
      `[RotationService] Updating rotation ${rotationId} with ${mealIds.length} meals`,
    );

    const { rotationPeriodId } = await ensureRotationPeriodForRotation(rotationId);

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

  async publishRotation(rotationId: string) {
    console.log(`[RotationService] Publishing rotation ${rotationId}`);

    const { rotationPeriodId } = await ensureRotationPeriodForRotation(rotationId);

    await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "PUBLISHED" },
    });

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { id: rotationId },
      include: summaryRotationInclude,
    });

    if (!rotation) {
      throw new Error(`Rotation ${rotationId} not found after publish`);
    }

    return withEffectiveMeals(rotation);
  },

  async archiveRotation(rotationId: string) {
    console.log(`[RotationService] Archiving rotation ${rotationId}`);

    const { rotationPeriodId } = await ensureRotationPeriodForRotation(rotationId);

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

    const { rotationPeriodId } = await ensureRotationPeriodForRotation(rotationId);

    await prisma.weeklyRotation.update({
      where: { id: rotationId },
      data: { status: "PUBLISHED" },
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
    const window = getOrderingWindowForDeliveryWeek(resolveOrderableWeekStart(now));

    return now >= window.windowStart && now < window.windowEnd;
  },

  async getAvailableMeals() {
    console.log(`[RotationService] Getting available meals`);

    const now = getNow();
    const currentWeekStart = resolveDeliveryWeekStart(now);
    const fallbackDeliveryWeekStart = resolveOrderableWeekStart(now);
    const fallbackDeliveryWeekEnd = resolveDeliveryWeekEnd(fallbackDeliveryWeekStart);
    const fallbackOrderCutoff = resolveOrderCutoff(fallbackDeliveryWeekStart);
    const orderableData = await this.getOrderableRotation();
    const { rotation, deliveryWeekStart, deliveryWeekDisplay, orderCutoff } =
      orderableData;
    const meals = (rotation?.meals || []).filter((meal) => meal.isActive);
    const resolvedDeliveryWeekStart =
      deliveryWeekStart || fallbackDeliveryWeekStart;
    const resolvedDeliveryWeekDisplay =
      deliveryWeekDisplay ||
      buildDeliveryWeekDisplay(fallbackDeliveryWeekStart, fallbackDeliveryWeekEnd);
    const resolvedOrderCutoff = orderCutoff || fallbackOrderCutoff;

    console.log(
      `[RotationService] Returning ${meals.length} rotating meals` +
        (deliveryWeekDisplay
          ? ` for ${deliveryWeekDisplay}`
          : " (no rotation available)"),
    );

    return {
      meals,
      isOrderingOpen: await this.isOrderingOpen(),
      currentWeekDisplay: buildDeliveryWeekDisplay(currentWeekStart),
      deliveryWeekDisplay: resolvedDeliveryWeekDisplay,
      deliveryWeekStart: formatBusinessTime(
        resolvedDeliveryWeekStart,
        "MMM d, yyyy",
      ),
      cutoffTime: resolvedOrderCutoff,
    };
  },

  async getOrCreateOrderingRotation() {
    const now = getNow();
    const deliveryWeekStart = resolveOrderableWeekStart(now);

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

  async getRotatingMeals() {
    return await prisma.meal.findMany({
      where: { mealType: "ROTATING" },
      include: { tags: true },
    });
  },

  async checkNextWeekWarning(): Promise<{
    needsAttention: boolean;
    message?: string;
  }> {
    const now = getNow();
    const currentWeekStart = resolveDeliveryWeekStart(now);
    const nextWeekStart = shiftDeliveryWeek(currentWeekStart, 1);
    const currentWeekEnd = resolveDeliveryWeekEnd(currentWeekStart);
    const daysUntilWeekEnd = Math.ceil(
      (currentWeekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWeekEnd > 3) {
      return { needsAttention: false };
    }

    const nextRotation = await prisma.weeklyRotation.findUnique({
      where: { weekStart: nextWeekStart },
      include: { rotationPeriod: true },
    });

    if (!nextRotation) {
      return {
        needsAttention: true,
        message: `No rotation created for next week (starting ${formatBusinessTime(nextWeekStart, "MMM d, yyyy")})`,
      };
    }

    if (!isRotationVisible(nextRotation)) {
      return {
        needsAttention: true,
        message: `Next week's rotation is in ${nextRotation.status} status - needs to be published`,
      };
    }

    return { needsAttention: false };
  },
};
