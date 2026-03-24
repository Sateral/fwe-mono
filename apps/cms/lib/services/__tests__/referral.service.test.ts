import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  referralCode: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  referralUse: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

const ledgerServiceMock = vi.hoisted(() => ({
  createEntry: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("../meal-plan-ledger.service", () => ({
  mealPlanLedgerService: ledgerServiceMock,
}));

import { referralService } from "../referral.service";

describe("referral.service", () => {
  beforeEach(() => {
    prismaMock.referralCode.findUnique.mockReset();
    prismaMock.referralCode.findMany.mockReset();
    prismaMock.referralCode.create.mockReset();
    prismaMock.referralCode.update.mockReset();
    prismaMock.referralUse.findMany.mockReset();
    prismaMock.referralUse.count.mockReset();
    ledgerServiceMock.createEntry.mockReset();
  });

  it("creates a referral code for a user", async () => {
    prismaMock.referralCode.create.mockResolvedValue({
      id: "rc_1",
      ownerUserId: "user_1",
      code: "FRIEND10",
      status: "ACTIVE",
      maxUses: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await referralService.createCode({
      ownerUserId: "user_1",
      code: "FRIEND10",
    });

    expect(result.code).toBe("FRIEND10");
    expect(result.status).toBe("ACTIVE");
    expect(prismaMock.referralCode.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: "user_1",
        code: "FRIEND10",
        status: "ACTIVE",
        maxUses: null,
      },
    });
  });

  it("creates a referral code with a max uses limit", async () => {
    prismaMock.referralCode.create.mockResolvedValue({
      id: "rc_2",
      ownerUserId: "user_2",
      code: "VIP5",
      status: "ACTIVE",
      maxUses: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await referralService.createCode({
      ownerUserId: "user_2",
      code: "VIP5",
      maxUses: 5,
    });

    expect(result.maxUses).toBe(5);
  });

  it("lists all referral codes with usage counts", async () => {
    prismaMock.referralCode.findMany.mockResolvedValue([
      {
        id: "rc_1",
        ownerUserId: "user_1",
        code: "FRIEND10",
        status: "ACTIVE",
        maxUses: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerUser: { id: "user_1", name: "Alice", email: "alice@example.com" },
        _count: { uses: 3 },
      },
      {
        id: "rc_2",
        ownerUserId: "user_2",
        code: "VIP5",
        status: "DISABLED",
        maxUses: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerUser: { id: "user_2", name: "Bob", email: "bob@example.com" },
        _count: { uses: 5 },
      },
    ]);

    const codes = await referralService.listCodes();

    expect(codes).toHaveLength(2);
    expect(codes[0]!.code).toBe("FRIEND10");
    expect(codes[0]!._count.uses).toBe(3);
    expect(codes[1]!.status).toBe("DISABLED");
  });

  it("deactivates a referral code", async () => {
    prismaMock.referralCode.update.mockResolvedValue({
      id: "rc_1",
      ownerUserId: "user_1",
      code: "FRIEND10",
      status: "DISABLED",
      maxUses: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await referralService.deactivateCode("rc_1");

    expect(result.status).toBe("DISABLED");
    expect(prismaMock.referralCode.update).toHaveBeenCalledWith({
      where: { id: "rc_1" },
      data: { status: "DISABLED" },
    });
  });

  it("reactivates a disabled referral code", async () => {
    prismaMock.referralCode.update.mockResolvedValue({
      id: "rc_1",
      ownerUserId: "user_1",
      code: "FRIEND10",
      status: "ACTIVE",
      maxUses: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await referralService.activateCode("rc_1");

    expect(result.status).toBe("ACTIVE");
    expect(prismaMock.referralCode.update).toHaveBeenCalledWith({
      where: { id: "rc_1" },
      data: { status: "ACTIVE" },
    });
  });

  it("gets a referral code with its usage details", async () => {
    prismaMock.referralCode.findUnique.mockResolvedValue({
      id: "rc_1",
      ownerUserId: "user_1",
      code: "FRIEND10",
      status: "ACTIVE",
      maxUses: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerUser: { id: "user_1", name: "Alice", email: "alice@example.com" },
      uses: [
        {
          id: "ru_1",
          referralCodeId: "rc_1",
          referredUserId: "user_3",
          referredUser: { id: "user_3", name: "Charlie", email: "charlie@example.com" },
          orderId: "order_1",
          createdAt: new Date(),
        },
      ],
    });

    const result = await referralService.getCodeWithUses("rc_1");

    expect(result).not.toBeNull();
    expect(result!.code).toBe("FRIEND10");
    expect(result!.uses).toHaveLength(1);
    expect(result!.uses[0]!.referredUser.name).toBe("Charlie");
  });

  it("returns null for a nonexistent referral code", async () => {
    prismaMock.referralCode.findUnique.mockResolvedValue(null);

    const result = await referralService.getCodeWithUses("rc_nonexistent");

    expect(result).toBeNull();
  });
});
