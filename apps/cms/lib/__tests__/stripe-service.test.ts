import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  checkoutSession: {
    findUnique: vi.fn(),
  },
  orderIntent: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const cartCheckoutServiceMock = vi.hoisted(() => ({
  finalizeCartCheckoutSession: vi.fn(),
  getCheckoutSessionIdFromCheckoutSession: vi.fn(),
  updateCartCheckoutStatus: vi.fn(),
}));

const stripeMock = vi.hoisted(() => ({
  checkout: {
    sessions: {
      retrieve: vi.fn(),
    },
  },
}));

const orderServiceMock = vi.hoisted(() => ({
  orderInclude: {
    meal: true,
    user: true,
  },
  createOrder: vi.fn(),
}));

vi.mock("../prisma", () => ({
  default: prismaMock,
}));

vi.mock("../services/cart-checkout.service", () => cartCheckoutServiceMock);

vi.mock("../stripe", () => ({
  stripe: stripeMock,
}));

vi.mock("../services/order.service", () => ({
  orderService: orderServiceMock,
}));

import {
  ensureOrderFromSession,
  extractPaymentIntentIds,
  updateOrderIntentStatus,
} from "../stripe-service";

describe("stripe-service", () => {
  beforeEach(() => {
    prismaMock.order.findFirst.mockReset();
    prismaMock.order.findMany.mockReset();
    prismaMock.checkoutSession.findUnique.mockReset();
    prismaMock.orderIntent.findUnique.mockReset();
    prismaMock.orderIntent.update.mockReset();
    cartCheckoutServiceMock.finalizeCartCheckoutSession.mockReset();
    cartCheckoutServiceMock.getCheckoutSessionIdFromCheckoutSession.mockReset();
    cartCheckoutServiceMock.updateCartCheckoutStatus.mockReset();
    stripeMock.checkout.sessions.retrieve.mockReset();
    orderServiceMock.createOrder.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an existing order before finalizing the session again", async () => {
    const existing = {
      id: "order_existing",
      stripeSessionId: "cs_existing",
    };

    prismaMock.order.findFirst.mockResolvedValue(existing);

    const order = await ensureOrderFromSession("cs_existing");

    expect(order).toBe(existing);
    expect(cartCheckoutServiceMock.finalizeCartCheckoutSession).not.toHaveBeenCalled();
  });

  it("extracts payment identifiers from an expanded payment intent", () => {
    expect(
      extractPaymentIntentIds({
        id: "pi_123",
        latest_charge: {
          id: "ch_123",
          balance_transaction: "txn_123",
        },
      } as never),
    ).toEqual({
      paymentIntentId: "pi_123",
      chargeId: "ch_123",
      balanceTransactionId: "txn_123",
    });
  });

  it("uses legacy single-intent fallback when no checkout snapshot can be identified", async () => {
    cartCheckoutServiceMock.getCheckoutSessionIdFromCheckoutSession.mockReturnValue(null);

    prismaMock.orderIntent.update.mockResolvedValue({ id: "intent_123" });

    const result = await updateOrderIntentStatus(
      {
        id: "cs_legacy",
        metadata: {
          orderIntentId: "intent_123",
        },
        payment_intent: "pi_legacy",
      } as never,
      "FAILED",
    );

    expect(cartCheckoutServiceMock.updateCartCheckoutStatus).not.toHaveBeenCalled();
    expect(prismaMock.orderIntent.update).toHaveBeenCalledWith({
      where: { id: "intent_123" },
      data: { status: "FAILED" },
    });
    expect(result).toEqual({ id: "intent_123" });
  });

  it("falls back to legacy paid-session finalization when no checkout snapshot exists", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_legacy",
      payment_status: "paid",
      payment_intent: {
        id: "pi_legacy",
        latest_charge: {
          id: "ch_legacy",
          balance_transaction: "txn_legacy",
        },
      },
      metadata: {
        orderIntentId: "intent_123",
      },
      client_reference_id: "intent_123",
    });
    cartCheckoutServiceMock.finalizeCartCheckoutSession.mockRejectedValue(
      new Error("Checkout session snapshot not found for cs_legacy"),
    );
    prismaMock.orderIntent.findUnique.mockResolvedValue({
      id: "intent_123",
      userId: "user_123",
      mealId: "meal_123",
      rotationId: "rotation_123",
      quantity: 2,
      unitPrice: 12.5,
      totalAmount: 25,
      currency: "cad",
      substitutions: [],
      modifiers: [],
      notes: null,
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      stripePaymentIntentId: null,
    });
    orderServiceMock.createOrder.mockResolvedValue({
      id: "order_legacy",
      orderIntentId: "intent_123",
    });
    prismaMock.orderIntent.update.mockResolvedValue({ id: "intent_123" });

    const order = await ensureOrderFromSession("cs_legacy");

    expect(order).toEqual({
      id: "order_legacy",
      orderIntentId: "intent_123",
    });
    expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderIntentId: "intent_123",
        stripeSessionId: "cs_legacy",
        stripePaymentIntentId: "pi_legacy",
        stripeChargeId: "ch_legacy",
        stripeBalanceTransactionId: "txn_legacy",
      }),
    );
  });
});
