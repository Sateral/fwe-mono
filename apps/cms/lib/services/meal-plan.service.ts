import prisma from "@/lib/prisma";
import {
  resolveFulfillmentCycleEnd,
  resolveOrderableWeekStart,
} from "./rotation-schedule";
import { mealPlanLedgerService } from "./meal-plan-ledger.service";

type MealPlanDbClient = Pick<
  typeof prisma,
  "mealPlan" | "mealPlanWindowUsage" | "mealPlanCreditLedger"
>;

type RedeemableCart = {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
};

type PurchaseMealPlanInput = {
  userId: string;
  weeklyCreditCap: number;
  creditAmount: number;
  autoRenew?: boolean;
};

function clampNonNegative(value: number) {
  return value < 0 ? 0 : value;
}

function resolveCurrentMealPlanWindow(now: Date) {
  const windowStart = resolveOrderableWeekStart(now);
  const windowEnd = resolveFulfillmentCycleEnd(windowStart);

  return { windowStart, windowEnd };
}

async function getActiveMealPlan(userId: string) {
  return prisma.mealPlan.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export const mealPlanService = {
  async purchasePlan(input: PurchaseMealPlanInput) {
    await prisma.$transaction(async (tx) => {
      const mealPlan = await tx.mealPlan.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          weeklyCreditCap: input.weeklyCreditCap,
          autoRenew: input.autoRenew ?? true,
          status: "ACTIVE",
        },
        update: {
          weeklyCreditCap: input.weeklyCreditCap,
          autoRenew: input.autoRenew ?? true,
          status: "ACTIVE",
          endsAt: null,
        },
      });

      await mealPlanLedgerService.createEntry(
        {
          mealPlanId: mealPlan.id,
          eventType: "PURCHASE",
          creditDelta: input.creditAmount,
          referenceType: "MEAL_PLAN",
          referenceId: `${mealPlan.id}:${Date.now()}`,
          note: "Meal plan purchase",
        },
        tx,
      );
    });

    return this.getPlanSummaryByUserId(input.userId);
  },

  async getPlanSummaryByUserId(userId: string, now = new Date()) {
    const mealPlan = await getActiveMealPlan(userId);
    if (!mealPlan) return null;

    const balance = await mealPlanLedgerService.getBalance(mealPlan.id);
    const { windowStart } = resolveCurrentMealPlanWindow(now);
    const usage = await prisma.mealPlanWindowUsage.findUnique({
      where: {
        mealPlanId_windowStart: {
          mealPlanId: mealPlan.id,
          windowStart,
        },
      },
    });

    return {
      id: mealPlan.id,
      status: mealPlan.status,
      remainingCredits: clampNonNegative(balance),
      weeklyCreditCap: mealPlan.weeklyCreditCap,
      currentWeekCreditsUsed: usage?.creditsUsed ?? 0,
      currentWeekCreditsRemaining: clampNonNegative(
        mealPlan.weeklyCreditCap - (usage?.creditsUsed ?? 0),
      ),
      autoRenew: mealPlan.autoRenew,
      startsAt: mealPlan.startsAt.toISOString(),
      endsAt: mealPlan.endsAt?.toISOString() ?? null,
    };
  },

  async getUsage(mealPlanId: string, now = new Date()) {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });
    if (!mealPlan) return null;

    const { windowStart, windowEnd } = resolveCurrentMealPlanWindow(now);
    const usage = await prisma.mealPlanWindowUsage.findUnique({
      where: {
        mealPlanId_windowStart: {
          mealPlanId,
          windowStart,
        },
      },
    });
    const remainingCredits = await mealPlanLedgerService.getBalance(mealPlanId);

    return {
      mealPlanId,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      creditsUsed: usage?.creditsUsed ?? 0,
      weeklyCreditCap: mealPlan.weeklyCreditCap,
      remainingCredits: clampNonNegative(remainingCredits),
      currentWeekCreditsRemaining: clampNonNegative(
        mealPlan.weeklyCreditCap - (usage?.creditsUsed ?? 0),
      ),
    };
  },

  async redeemCart(
    cart: RedeemableCart,
    now = new Date(),
    db?: MealPlanDbClient,
  ) {
    const executeRedemption = async (tx: MealPlanDbClient) => {
      const mealPlan = await tx.mealPlan.findFirst({
        where: {
          userId: cart.userId,
          status: "ACTIVE",
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: "desc" },
      });

      if (!mealPlan) {
        throw new Error("No active meal plan found");
      }

      const creditsRequired = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const existingRedemption = await mealPlanLedgerService.findEntryByReference(
        mealPlan.id,
        "REDEMPTION",
        "CART",
        cart.id,
        tx,
      );

      if (existingRedemption) {
        return {
          mealPlanId: mealPlan.id,
          creditsRedeemed: Math.abs(existingRedemption.creditDelta),
        };
      }

      const remainingCredits = await mealPlanLedgerService.getBalance(mealPlan.id, tx);
      if (remainingCredits < creditsRequired) {
        throw new Error("Not enough meal plan credits");
      }

      const { windowStart, windowEnd } = resolveCurrentMealPlanWindow(now);
      const usage = await tx.mealPlanWindowUsage.findUnique({
        where: {
          mealPlanId_windowStart: {
            mealPlanId: mealPlan.id,
            windowStart,
          },
        },
      });
      const nextCreditsUsed = (usage?.creditsUsed ?? 0) + creditsRequired;

      if (nextCreditsUsed > mealPlan.weeklyCreditCap) {
        throw new Error("Cart exceeds weekly credit cap");
      }

      const insertedRedemption = await tx.mealPlanCreditLedger.createMany({
        data: [
          {
            mealPlanId: mealPlan.id,
            eventType: "REDEMPTION",
            creditDelta: -creditsRequired,
            referenceType: "CART",
            referenceId: cart.id,
            note: "Meal plan cart redemption",
          },
        ],
        skipDuplicates: true,
      });

      if (insertedRedemption.count === 0) {
        const duplicateRedemption = await mealPlanLedgerService.findEntryByReference(
          mealPlan.id,
          "REDEMPTION",
          "CART",
          cart.id,
          tx,
        );

        return {
          mealPlanId: mealPlan.id,
          creditsRedeemed: Math.abs(duplicateRedemption?.creditDelta ?? creditsRequired),
        };
      }

      await tx.mealPlanWindowUsage.upsert({
        where: {
          mealPlanId_windowStart: {
            mealPlanId: mealPlan.id,
            windowStart,
          },
        },
        create: {
          mealPlanId: mealPlan.id,
          windowStart,
          windowEnd,
          creditsUsed: creditsRequired,
        },
        update: {
          creditsUsed: nextCreditsUsed,
          windowEnd,
        },
      });

      return {
        mealPlanId: mealPlan.id,
        creditsRedeemed: creditsRequired,
      };
    };

    if (db) {
      return executeRedemption(db);
    }

    return prisma.$transaction(async (tx) => executeRedemption(tx));
  },

  async getLedgerEntries(mealPlanId: string) {
    return mealPlanLedgerService.listEntries(mealPlanId);
  },
};
