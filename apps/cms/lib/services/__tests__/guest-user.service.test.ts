import { Prisma } from "@fwe/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  order: {
    updateMany: vi.fn(),
  },
  cart: {
    updateMany: vi.fn(),
  },
  orderIntent: {
    updateMany: vi.fn(),
  },
  checkoutSession: {
    updateMany: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

import {
  guestUserService,
  normalizeGuestEmail,
} from "../guest-user.service";

describe("guest-user.service", () => {
  beforeEach(() => {
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.$transaction.mockReset();
    txMock.order.updateMany.mockReset();
    txMock.cart.updateMany.mockReset();
    txMock.orderIntent.updateMany.mockReset();
    txMock.checkoutSession.updateMany.mockReset();
    txMock.user.update.mockReset();
  });

  it("creates a guest user for anonymous checkout", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      id: "guest_123",
      ...data,
    }));

    const user = await guestUserService.findOrCreateCheckoutGuestUser({
      email: " Customer@Example.com ",
      name: " Customer ",
    });

    expect(user.isGuest).toBe(true);
    expect(user.guestSource).toBe("CHECKOUT");
    expect(user.guestSourceId).toBe("customer@example.com");
    expect(user.email).toMatch(/^guest\.[a-z0-9-]+@checkout\.freewilleats\.local$/);
    expect(user.guestMetadata).toEqual({
      checkoutEmail: "Customer@Example.com",
      checkoutName: "Customer",
      normalizedEmail: "customer@example.com",
    });
  });

  it("does not auto-merge conflicting guest identities", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "customer@example.com",
      isGuest: false,
      mergedIntoUserId: null,
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "guest_1", guestSourceId: "customer@example.com" },
      { id: "guest_2", guestSourceId: "customer@example.com" },
    ]);

    const result =
      await guestUserService.reconcileGuestUserForAuthenticatedUser("user_123");

    expect(result.requiresReview).toBe(true);
    expect(result.mergedUserIds).toEqual([]);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("recovers from a guest email race by reusing the concurrently created guest", async () => {
    const existingGuest = {
      id: "guest_existing",
      isGuest: true,
      guestSource: "CHECKOUT",
      guestSourceId: "customer@example.com",
    };

    prismaMock.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingGuest);
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const user = await guestUserService.findOrCreateCheckoutGuestUser({
      email: "customer@example.com",
      name: "Customer",
    });

    expect(user).toBe(existingGuest);
    expect(prismaMock.user.findFirst).toHaveBeenCalledTimes(2);
  });

  it("auto-merges a single exact guest match after sign-in", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_123",
      email: "Customer@Example.com",
      isGuest: false,
      mergedIntoUserId: null,
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "guest_1", guestSourceId: "customer@example.com" },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback) => callback(txMock));

    const result =
      await guestUserService.reconcileGuestUserForAuthenticatedUser("user_123");

    expect(result).toEqual({
      mergedUserIds: ["guest_1"],
      requiresReview: false,
    });
    expect(txMock.order.updateMany).toHaveBeenCalledWith({
      where: { userId: "guest_1" },
      data: { userId: "user_123" },
    });
    expect(txMock.cart.updateMany).toHaveBeenCalledWith({
      where: { userId: "guest_1" },
      data: { userId: "user_123" },
    });
    expect(txMock.orderIntent.updateMany).toHaveBeenCalledWith({
      where: { userId: "guest_1" },
      data: { userId: "user_123" },
    });
    expect(txMock.checkoutSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "guest_1" },
      data: { userId: "user_123" },
    });
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "guest_1" },
      data: expect.objectContaining({
        guestSourceId: null,
        mergedIntoUserId: "user_123",
      }),
    });
  });

  it("normalizes guest emails conservatively", () => {
    expect(normalizeGuestEmail(" Customer@Example.com ")).toBe(
      "customer@example.com",
    );
  });
});
