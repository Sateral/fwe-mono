import prisma from "@/lib/prisma";

type LedgerDbClient = Pick<
  typeof prisma,
  "mealPlanCreditLedger"
>;

type LedgerEntryInput = {
  mealPlanId: string;
  eventType:
    | "PURCHASE"
    | "REDEMPTION"
    | "PLAN_STARTED"
    | "PLAN_RENEWED"
    | "ORDER_REDEEMED"
    | "ORDER_REVERSED"
    | "MANUAL_ADJUSTMENT"
    | "REFERRAL_BONUS"
    | "EXPIRATION";
  creditDelta: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
};

export const mealPlanLedgerService = {
  async createEntry(input: LedgerEntryInput, db: LedgerDbClient = prisma) {
    return db.mealPlanCreditLedger.create({
      data: input,
    });
  },

  async getBalance(mealPlanId: string, db: LedgerDbClient = prisma) {
    const result = await db.mealPlanCreditLedger.aggregate({
      where: { mealPlanId },
      _sum: { creditDelta: true },
    });

    return result._sum.creditDelta ?? 0;
  },

  async findEntryByReference(
    mealPlanId: string,
    eventType: LedgerEntryInput["eventType"],
    referenceType: string,
    referenceId: string,
    db: LedgerDbClient = prisma,
  ) {
    return db.mealPlanCreditLedger.findFirst({
      where: {
        mealPlanId,
        eventType,
        referenceType,
        referenceId,
      },
    });
  },

  async listEntries(mealPlanId: string, db: LedgerDbClient = prisma) {
    return db.mealPlanCreditLedger.findMany({
      where: { mealPlanId },
      orderBy: { createdAt: "asc" },
    });
  },
};
