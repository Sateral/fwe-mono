import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateOrderInput } from "@fwe/validators";

const prismaMock = vi.hoisted(() => ({
  order: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  weeklyRotation: {
    findUnique: vi.fn(),
  },
}));

const weeklyRotationServiceMock = vi.hoisted(() => ({
  getOrCreateOrderingRotation: vi.fn(),
}));

vi.mock("../../prisma", () => ({
  default: prismaMock,
}));

vi.mock("../weekly-rotation.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../weekly-rotation.service")>();

  return {
    ...actual,
    weeklyRotationService: weeklyRotationServiceMock,
  };
});

import { orderService } from "../order.service";

const input: CreateOrderInput = {
  userId: "user_123",
  mealId: "meal_123",
  mealName: "Test Meal",
  rotationId: "rotation_123",
  quantity: 2,
  unitPrice: 14.5,
  totalAmount: 29,
  currency: "cad",
  orderIntentId: "intent_123",
  stripeSessionId: "cs_test_123",
  stripePaymentIntentId: "pi_test_123",
};

describe("order.service", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    prismaMock.order.findFirst.mockReset();
    prismaMock.order.create.mockReset();
    prismaMock.weeklyRotation.findUnique.mockReset();
    weeklyRotationServiceMock.getOrCreateOrderingRotation.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns one existing order when the same stripe identifiers are retried", async () => {
    const existing = {
      id: "order_existing",
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      orderIntentId: input.orderIntentId,
    };

    prismaMock.order.findFirst.mockResolvedValue(existing);

    const order = await orderService.createOrder(input);

    expect(order.id).toBe(existing.id);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("returns the persisted duplicate order after create fails and a retry lookup finds it", async () => {
    const existing = {
      id: "order_race",
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      orderIntentId: input.orderIntentId,
    };

    prismaMock.order.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    prismaMock.weeklyRotation.findUnique.mockResolvedValue({
      id: input.rotationId,
    });
    prismaMock.order.create.mockRejectedValue(
      new Error("Duplicate order already persisted"),
    );

    const order = await orderService.createOrder(input);

    expect(order.id).toBe(existing.id);
    expect(prismaMock.order.findFirst).toHaveBeenCalledTimes(2);
  });

  it("dedupes cart fan-out retries by orderIntentId instead of shared stripe identifiers", async () => {
    const existing = {
      id: "order_existing",
      orderIntentId: input.orderIntentId,
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
    };

    prismaMock.order.findFirst.mockResolvedValue(existing);

    await orderService.createOrder({
      ...input,
      stripeSessionId: "cs_shared",
      stripePaymentIntentId: "pi_shared",
    });

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ orderIntentId: input.orderIntentId }],
        },
      }),
    );
  });
});
