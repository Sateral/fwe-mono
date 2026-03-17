import { Prisma } from "@fwe/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  meal: {
    findMany: vi.fn(),
  },
  cart: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import { cartService } from "../cart.service";

describe("cart.service", () => {
  beforeEach(() => {
    prismaMock.meal.findMany.mockReset();
    prismaMock.cart.findFirst.mockReset();
    prismaMock.cart.create.mockReset();
    prismaMock.cart.findUnique.mockReset();
    prismaMock.cart.update.mockReset();
  });

  it("reuses an existing cart for the same client request id", async () => {
    const existingCart = {
      id: "cart_existing",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [],
    };

    prismaMock.cart.findFirst.mockResolvedValue(existingCart);

    const cart = await cartService.createCart("user_123", {
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      rotationId: "rotation_123",
      settlementMethod: "STRIPE",
      items: [
        {
          mealId: "meal_1",
          quantity: 1,
          proteinBoost: false,
        },
      ],
    });

    expect(cart).toBe(existingCart);
    expect(prismaMock.cart.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_123",
        clientRequestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      },
      include: cartService.cartInclude,
    });
    expect(prismaMock.meal.findMany).not.toHaveBeenCalled();
    expect(prismaMock.cart.create).not.toHaveBeenCalled();
  });

  it("recovers from a clientRequestId race by returning the cart created by another request", async () => {
    const existingCart = {
      id: "cart_existing",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [],
    };

    prismaMock.cart.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingCart);
    prismaMock.meal.findMany.mockResolvedValue([
      {
        id: "meal_1",
        price: 12.5,
        substitutionGroups: [],
        modifierGroups: [],
      },
    ]);
    prismaMock.cart.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const cart = await cartService.createCart("user_123", {
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      rotationId: "rotation_123",
      settlementMethod: "STRIPE",
      items: [
        {
          mealId: "meal_1",
          quantity: 1,
          proteinBoost: false,
        },
      ],
    });

    expect(cart).toBe(existingCart);
    expect(prismaMock.cart.findFirst).toHaveBeenCalledTimes(2);
  });
});
