import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    findUnique: vi.fn(),
  },
  orderIntent: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
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

vi.mock("../stripe", () => ({
  stripe: stripeMock,
}));

vi.mock("../services/order.service", () => ({
  orderService: orderServiceMock,
}));

import {
  ensureOrderFromSession,
  extractPaymentIntentIds,
} from "../stripe-service";

describe("stripe-service", () => {
  beforeEach(() => {
    prismaMock.order.findUnique.mockReset();
    prismaMock.orderIntent.findUnique.mockReset();
    prismaMock.orderIntent.update.mockReset();
    stripeMock.checkout.sessions.retrieve.mockReset();
    orderServiceMock.createOrder.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an existing order before retrieving the Stripe session again", async () => {
    const existing = {
      id: "order_existing",
      stripeSessionId: "cs_existing",
    };

    prismaMock.order.findUnique.mockResolvedValue(existing);

    const order = await ensureOrderFromSession("cs_existing");

    expect(order).toBe(existing);
    expect(stripeMock.checkout.sessions.retrieve).not.toHaveBeenCalled();
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
});
