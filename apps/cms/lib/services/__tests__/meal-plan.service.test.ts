import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  mealPlan: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  mealPlanWindowUsage: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  mealPlanCreditLedger: {
    create: vi.fn(),
    createMany: vi.fn(),
    aggregate: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const ledgerServiceMock = vi.hoisted(() => ({
  createEntry: vi.fn(),
  getBalance: vi.fn(),
  findEntryByReference: vi.fn(),
  listEntries: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("../meal-plan-ledger.service", () => ({
  mealPlanLedgerService: ledgerServiceMock,
}));

import { mealPlanService } from "../meal-plan.service";

describe("meal-plan.service", () => {
  beforeEach(() => {
    prismaMock.mealPlan.findUnique.mockReset();
    prismaMock.mealPlan.findFirst.mockReset();
    prismaMock.mealPlan.upsert.mockReset();
    prismaMock.mealPlanWindowUsage.findUnique.mockReset();
    prismaMock.mealPlanWindowUsage.upsert.mockReset();
    prismaMock.mealPlanCreditLedger.create.mockReset();
    prismaMock.mealPlanCreditLedger.createMany.mockReset();
    prismaMock.mealPlanCreditLedger.aggregate.mockReset();
    prismaMock.mealPlanCreditLedger.findFirst.mockReset();
    prismaMock.mealPlanCreditLedger.findMany.mockReset();
    prismaMock.$transaction.mockReset();
    ledgerServiceMock.createEntry.mockReset();
    ledgerServiceMock.getBalance.mockReset();
    ledgerServiceMock.findEntryByReference.mockReset();
    ledgerServiceMock.listEntries.mockReset();
  });

  it("blocks redemption above weekly cap", async () => {
    prismaMock.mealPlan.findFirst.mockResolvedValue({
      id: "plan_123",
      userId: "user_123",
      weeklyCreditCap: 2,
      status: "ACTIVE",
    });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );
    ledgerServiceMock.getBalance.mockResolvedValue(10);
    prismaMock.mealPlanWindowUsage.findUnique.mockResolvedValue({
      id: "usage_123",
      mealPlanId: "plan_123",
      creditsUsed: 2,
    });
    prismaMock.mealPlanCreditLedger.createMany.mockResolvedValue({ count: 1 });
    ledgerServiceMock.findEntryByReference.mockResolvedValue(null);

    await expect(
      mealPlanService.redeemCart(
        {
          id: "cart_123",
          userId: "user_123",
          items: [
            { id: "item_1", quantity: 1 },
            { id: "item_2", quantity: 1 },
          ],
        },
        new Date("2026-03-23T16:00:00.000Z"),
      ),
    ).rejects.toThrow("weekly credit cap");
  });

  it("creates purchase and redemption ledger entries", async () => {
    prismaMock.mealPlan.upsert.mockResolvedValue({
      id: "plan_123",
      userId: "user_123",
      weeklyCreditCap: 5,
      status: "ACTIVE",
      autoRenew: true,
      startsAt: new Date("2026-03-23T00:00:00.000Z"),
      endsAt: null,
    });
    ledgerServiceMock.getBalance.mockResolvedValue(10);
    prismaMock.mealPlan.findFirst.mockResolvedValue({
      id: "plan_123",
      userId: "user_123",
      weeklyCreditCap: 5,
      status: "ACTIVE",
      autoRenew: true,
      startsAt: new Date("2026-03-23T00:00:00.000Z"),
      endsAt: null,
    });
    prismaMock.mealPlanWindowUsage.findUnique.mockResolvedValue(null);
    prismaMock.mealPlanWindowUsage.upsert.mockResolvedValue({
      id: "usage_123",
      mealPlanId: "plan_123",
      creditsUsed: 2,
    });
    prismaMock.mealPlanCreditLedger.createMany.mockResolvedValue({ count: 1 });
    ledgerServiceMock.findEntryByReference.mockResolvedValue(null);
    ledgerServiceMock.listEntries.mockResolvedValue([
      { eventType: "PURCHASE" },
      { eventType: "REDEMPTION" },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );

    await mealPlanService.purchasePlan({
      userId: "user_123",
      weeklyCreditCap: 5,
      creditAmount: 10,
      autoRenew: true,
    });

    await mealPlanService.redeemCart(
      {
        id: "cart_123",
        userId: "user_123",
        items: [{ id: "item_1", quantity: 2 }],
      },
      new Date("2026-03-23T16:00:00.000Z"),
    );

    const entries = await mealPlanService.getLedgerEntries("plan_123");

    expect(entries.map((entry) => entry.eventType)).toEqual([
      "PURCHASE",
      "REDEMPTION",
    ]);
    expect(ledgerServiceMock.createEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        mealPlanId: "plan_123",
        eventType: "PURCHASE",
        creditDelta: 10,
        referenceType: "MEAL_PLAN",
        note: "Meal plan purchase",
      }),
      expect.anything(),
    );
    expect(prismaMock.mealPlanCreditLedger.createMany).toHaveBeenCalledWith({
      data: [
        {
          mealPlanId: "plan_123",
          eventType: "REDEMPTION",
          creditDelta: -2,
          referenceType: "CART",
          referenceId: "cart_123",
          note: "Meal plan cart redemption",
        },
      ],
      skipDuplicates: true,
    });
  });
});
