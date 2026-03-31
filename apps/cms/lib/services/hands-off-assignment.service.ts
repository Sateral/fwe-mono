import { Prisma } from "@fwe/db";

import prisma from "@/lib/prisma";
import { mealPlanService } from "./meal-plan.service";
import { weeklyRotationService } from "./weekly-rotation.service";

type RotationMeal = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: Prisma.Decimal | number;
  tags: Array<{ name: string }>;
};

type EligibleUser = {
  id: string;
  name: string;
  email: string;
  flavorProfile: {
    involvement: "HANDS_ON" | "HANDS_OFF";
    goals: string[];
    restrictions: string[];
    preferences: string[];
  } | null;
};

type AssignmentResult = {
  rotationId: string;
  assignedMeals: Array<{
    userId: string;
    mealId: string;
    mealName: string;
  }>;
  assignedUsers: string[];
};

function getAssignmentRequestId(
  userId: string,
  rotationId: string,
  mealId: string,
) {
  return `assignment:${userId}:${rotationId}:${mealId}`;
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number"
    ? value
    : new Prisma.Decimal(value).toNumber();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildMealSearchBlob(meal: RotationMeal) {
  return normalizeText(
    [
      meal.name,
      meal.description ?? "",
      ...meal.tags.map((tag) => tag.name),
    ].join(" "),
  );
}

function matchesRestriction(meal: RotationMeal, restrictions: string[]) {
  const searchable = buildMealSearchBlob(meal);
  return restrictions.some((restriction) =>
    searchable.includes(normalizeText(restriction)),
  );
}

function scoreMeal(meal: RotationMeal, user: EligibleUser) {
  const searchable = buildMealSearchBlob(meal);
  const preferences = user.flavorProfile?.preferences ?? [];
  const goals = user.flavorProfile?.goals ?? [];

  let score = 0;
  for (const preference of preferences) {
    if (searchable.includes(normalizeText(preference))) {
      score += 3;
    }
  }
  for (const goal of goals) {
    if (searchable.includes(normalizeText(goal))) {
      score += 2;
    }
  }

  return score;
}

function buildAssignmentCart(
  rotationId: string,
  userId: string,
  meals: RotationMeal[],
) {
  return {
    id: `assignment:${userId}:${rotationId}`,
    userId,
    items: meals.map((meal) => ({
      id: `assignment-item:${userId}:${meal.id}`,
      quantity: 1,
    })),
  };
}

export const handsOffAssignmentService = {
  async assignCurrentRotation(): Promise<AssignmentResult> {
    const rotation = await weeklyRotationService.getCurrentRotation();

    if (!rotation) {
      throw new Error("No active rotation available for Hands OFF assignment");
    }

    const eligibleUsers = (await prisma.user.findMany({
      where: {
        onboardingStatus: "COMPLETED",
        flavorProfile: {
          is: {
            involvement: "HANDS_OFF",
          },
        },
        mealPlan: {
          is: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        flavorProfile: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })) as EligibleUser[];

    const assignedMeals: AssignmentResult["assignedMeals"] = [];
    const assignedUsers: string[] = [];

    for (const user of eligibleUsers) {
      const mealPlanSummary = await mealPlanService.getPlanSummaryByUserId(
        user.id,
      );
      if (!mealPlanSummary) continue;

      const maxAssignments = Math.min(
        mealPlanSummary.weeklyCreditCap,
        mealPlanSummary.remainingCredits,
        mealPlanSummary.currentWeekCreditsRemaining,
        rotation.meals.length,
      );

      if (maxAssignments <= 0) {
        continue;
      }

      const existingAssignedOrders = await prisma.order.findMany({
        where: {
          userId: user.id,
          rotationId: rotation.id,
          settlementMethod: "MEAL_PLAN_CREDITS",
          orderIntentId: null,
          paymentStatus: "PAID",
          fulfillmentStatus: { not: "CANCELLED" },
        },
      });

      if (existingAssignedOrders.length > 0) {
        continue;
      }

      const restrictions = user.flavorProfile?.restrictions ?? [];
      const candidateMeals = rotation.meals
        .filter(
          (meal) => !matchesRestriction(meal as RotationMeal, restrictions),
        )
        .sort((a, b) => {
          const scoreDiff =
            scoreMeal(b as RotationMeal, user) -
            scoreMeal(a as RotationMeal, user);
          return scoreDiff !== 0 ? scoreDiff : a.name.localeCompare(b.name);
        })
        .slice(0, maxAssignments) as RotationMeal[];

      if (candidateMeals.length === 0) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await mealPlanService.redeemCart(
          buildAssignmentCart(rotation.id, user.id, candidateMeals),
          new Date(),
          tx,
        );

        for (const meal of candidateMeals) {
          const clientRequestId = getAssignmentRequestId(
            user.id,
            rotation.id,
            meal.id,
          );
          const orderIntent =
            (await tx.orderIntent.findFirst({
              where: { clientRequestId },
            })) ??
            (await tx.orderIntent.create({
              data: {
                clientRequestId,
                userId: user.id,
                mealId: meal.id,
                rotationId: rotation.id,
                quantity: 1,
                unitPrice: toNumber(meal.price),
                totalAmount: toNumber(meal.price),
                currency: "cad",
                settlementMethod: "MEAL_PLAN_CREDITS",
                deliveryMethod: "DELIVERY",
                status: "PAID",
              },
            }));

          const existingOrder = await tx.order.findFirst({
            where: {
              orderIntentId: orderIntent.id,
            },
          });

          if (!existingOrder) {
            await tx.order.create({
              data: {
                userId: user.id,
                mealId: meal.id,
                mealName: meal.name,
                rotationId: rotation.id,
                settlementMethod: "MEAL_PLAN_CREDITS",
                orderIntentId: orderIntent.id,
                quantity: 1,
                unitPrice: toNumber(meal.price),
                totalAmount: toNumber(meal.price),
                paymentStatus: "PAID",
                fulfillmentStatus: "NEW",
                currency: "cad",
                paidAt: new Date(),
                deliveryMethod: "DELIVERY",
                customerName: user.name,
                customerEmail: user.email,
              },
            });
          }

          assignedMeals.push({
            userId: user.id,
            mealId: meal.id,
            mealName: meal.name,
          });
        }
      });

      assignedUsers.push(user.id);
    }

    return {
      rotationId: rotation.id,
      assignedMeals,
      assignedUsers,
    };
  },
};
