import { Prisma } from "@fwe/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  cart: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  checkoutSession: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orderIntent: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const stripeMock = vi.hoisted(() => ({
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
}));

const orderServiceMock = vi.hoisted(() => ({
  createOrder: vi.fn(),
}));

const mealPlanServiceMock = vi.hoisted(() => ({
  getPlanSummaryByUserId: vi.fn(),
  redeemCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: stripeMock,
}));

vi.mock("@/lib/services/order.service", () => ({
  orderService: orderServiceMock,
}));

vi.mock("@/lib/services/meal-plan.service", () => ({
  mealPlanService: mealPlanServiceMock,
}));

import {
  createStripeCheckoutSessionForCart,
  finalizeCartCheckoutSession,
} from "../cart-checkout.service";

describe("cart-checkout.service", () => {
  beforeEach(() => {
    prismaMock.cart.findUnique.mockReset();
    prismaMock.cart.update.mockReset();
    prismaMock.order.findFirst.mockReset();
    prismaMock.checkoutSession.findFirst.mockReset();
    prismaMock.checkoutSession.findUnique.mockReset();
    prismaMock.checkoutSession.create.mockReset();
    prismaMock.checkoutSession.update.mockReset();
    prismaMock.order.findMany.mockReset();
    prismaMock.order.create.mockReset();
    prismaMock.orderIntent.findFirst.mockReset();
    prismaMock.orderIntent.create.mockReset();
    prismaMock.orderIntent.updateMany.mockReset();
    prismaMock.$transaction.mockReset();
    stripeMock.checkout.sessions.create.mockReset();
    stripeMock.checkout.sessions.retrieve.mockReset();
    orderServiceMock.createOrder.mockReset();
    mealPlanServiceMock.getPlanSummaryByUserId.mockReset();
    mealPlanServiceMock.redeemCart.mockReset();
  });

  it("bypasses Stripe for carts fully covered by meal plan credits", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_credits_123",
      userId: "user_123",
      settlementMethod: "MEAL_PLAN_CREDITS",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });
    prismaMock.orderIntent.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.create.mockResolvedValue({ id: "intent_1", rotationId: "rotation_123" });
    mealPlanServiceMock.getPlanSummaryByUserId.mockResolvedValue({
      id: "plan_123",
      remainingCredits: 10,
      currentWeekCreditsRemaining: 10,
    });
    mealPlanServiceMock.redeemCart.mockResolvedValue({ mealPlanId: "plan_123", creditsRedeemed: 2 });
    prismaMock.order.findFirst.mockResolvedValue(null);
    prismaMock.order.create.mockResolvedValue({ id: "order_1", orderIntentId: "intent_1" });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );

    const session = await createStripeCheckoutSessionForCart({
      cartId: "cart_credits_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_credits_123",
    });

    expect(session).toEqual({ id: "meal-plan-cart_credits_123", url: null });
    expect(mealPlanServiceMock.redeemCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cart_credits_123" }),
      expect.any(Date),
      expect.anything(),
    );
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settlementMethod: "MEAL_PLAN_CREDITS",
        }),
      }),
    );
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects hybrid meal plan carts in v1 when credits do not fully cover the cart", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_hybrid_123",
      userId: "user_123",
      settlementMethod: "MEAL_PLAN_CREDITS",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 3,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });
    mealPlanServiceMock.getPlanSummaryByUserId.mockResolvedValue({
      id: "plan_123",
      remainingCredits: 2,
      currentWeekCreditsRemaining: 2,
    });

    await expect(
      createStripeCheckoutSessionForCart({
        cartId: "cart_hybrid_123",
        userEmail: "customer@example.com",
        userName: "Customer",
        deliveryMethod: "DELIVERY",
        requestId: "request_hybrid_123",
      }),
    ).rejects.toThrow("Hybrid carts are not supported in v1");

    expect(mealPlanServiceMock.redeemCart).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("creates one stripe session with multiple line items and stores an immutable checkout snapshot", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [{ groupName: "Base", optionName: "Rice" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Hot"] }],
          proteinBoost: false,
          notes: "No onions",
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
        {
          id: "item_2",
          mealId: "meal_2",
          quantity: 1,
          unitPrice: 15,
          substitutions: [],
          modifiers: [],
          proteinBoost: true,
          notes: null,
          deliveryMethod: "PICKUP",
          pickupLocation: "Xtreme Couture",
          meal: {
            id: "meal_2",
            name: "Salmon Bowl",
            slug: "salmon-bowl",
            imageUrl: null,
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.create
      .mockResolvedValueOnce({ id: "intent_1" })
      .mockResolvedValueOnce({ id: "intent_2" });
    prismaMock.checkoutSession.create.mockResolvedValue({
      id: "checkout_session_123",
      items: [{ id: "snapshot_1" }, { id: "snapshot_2" }],
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123",
      url: "https://checkout.stripe.test/cs_cart_123",
      payment_intent: null,
    });

    const session = await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(session.id).toBe("cs_cart_123");
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
    expect(
      stripeMock.checkout.sessions.create.mock.calls[0]?.[0].line_items,
    ).toHaveLength(2);
    expect(prismaMock.checkoutSession.create).toHaveBeenCalledTimes(1);
    expect(
      prismaMock.checkoutSession.create.mock.calls[0]?.[0].data.items.create,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderIntentId: "intent_1",
          deliveryMethod: "DELIVERY",
        }),
        expect.objectContaining({
          orderIntentId: "intent_2",
          deliveryMethod: "DELIVERY",
        }),
      ]),
    );
    expect(prismaMock.checkoutSession.update).toHaveBeenCalledWith({
      where: { id: "checkout_session_123" },
      data: expect.objectContaining({
        stripeSessionId: "cs_cart_123",
      }),
    });
    expect(prismaMock.orderIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["intent_1", "intent_2"] },
      },
      data: {
        status: "SESSION_CREATED",
      },
    });
  });

  it("creates one order per snapshot item after webhook finalization", async () => {
    prismaMock.order.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "order_1", orderIntentId: "intent_1" }, { id: "order_2", orderIntentId: "intent_2" }]);
    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      stripeSessionId: "cs_cart_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [{ groupName: "Base", optionName: "Rice" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Hot"] }],
          proteinBoost: false,
          notes: "No onions",
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
        {
          id: "snapshot_2",
          orderIntentId: "intent_2",
          mealId: "meal_2",
          rotationId: "rotation_123",
          quantity: 1,
          unitPrice: 15,
          totalAmount: 15,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: true,
          notes: null,
          deliveryMethod: "PICKUP",
          pickupLocation: "Xtreme Couture",
        },
      ],
    });

    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "CHECKED_OUT",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [{ groupName: "Base", optionName: "Potatoes" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Mild"] }],
          proteinBoost: false,
          notes: "Changed after checkout",
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
        {
          id: "item_2",
          mealId: "meal_2",
          quantity: 1,
          unitPrice: 15,
          substitutions: [],
          modifiers: [],
          proteinBoost: true,
          notes: null,
          meal: {
            id: "meal_2",
            name: "Salmon Bowl",
            slug: "salmon-bowl",
            imageUrl: null,
          },
          rotationId: "rotation_123",
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_cart_123",
      payment_status: "paid",
      payment_intent: {
        id: "pi_cart_123",
        latest_charge: {
          id: "ch_cart_123",
          balance_transaction: "txn_cart_123",
        },
      },
      metadata: {
        checkoutSessionId: "checkout_session_123",
      },
    });

    orderServiceMock.createOrder
      .mockResolvedValueOnce({ id: "order_1", orderIntentId: "intent_1" })
      .mockResolvedValueOnce({ id: "order_2", orderIntentId: "intent_2" });

    const createdOrders = await finalizeCartCheckoutSession("cs_cart_123");

    expect(createdOrders).toHaveLength(2);
    expect(orderServiceMock.createOrder).toHaveBeenCalledTimes(2);
    expect(prismaMock.cart.findUnique).not.toHaveBeenCalled();
    expect(orderServiceMock.createOrder).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderIntentId: "intent_1",
        substitutions: [{ groupName: "Base", optionName: "Rice" }],
        modifiers: [{ groupName: "Sauce", optionNames: ["Hot"] }],
        notes: "No onions",
        deliveryMethod: "DELIVERY",
        pickupLocation: undefined,
        stripeSessionId: "cs_cart_123",
        stripePaymentIntentId: "pi_cart_123",
      }),
    );
    expect(orderServiceMock.createOrder).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderIntentId: "intent_2",
        deliveryMethod: "PICKUP",
        pickupLocation: "Xtreme Couture",
        stripeSessionId: "cs_cart_123",
        stripePaymentIntentId: "pi_cart_123",
      }),
    );
  });

  it("recovers partially finalized sessions by creating only missing orders", async () => {
    prismaMock.order.findMany
      .mockResolvedValueOnce([{ id: "order_1", orderIntentId: "intent_1" }])
      .mockResolvedValueOnce([
        { id: "order_1", orderIntentId: "intent_1" },
        { id: "order_2", orderIntentId: "intent_2" },
      ]);

    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_cart_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [{ groupName: "Base", optionName: "Rice" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Hot"] }],
          proteinBoost: false,
          notes: "No onions",
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
        {
          id: "snapshot_2",
          orderIntentId: "intent_2",
          mealId: "meal_2",
          rotationId: "rotation_123",
          quantity: 1,
          unitPrice: 15,
          totalAmount: 15,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: true,
          notes: null,
          deliveryMethod: "PICKUP",
          pickupLocation: "Xtreme Couture",
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_cart_123",
      payment_status: "paid",
      payment_intent: {
        id: "pi_cart_123",
        latest_charge: {
          id: "ch_cart_123",
          balance_transaction: "txn_cart_123",
        },
      },
      metadata: {
        checkoutSessionId: "checkout_session_123",
      },
    });

    orderServiceMock.createOrder.mockResolvedValueOnce({
      id: "order_2",
      orderIntentId: "intent_2",
    });

    const createdOrders = await finalizeCartCheckoutSession("cs_cart_123");

    expect(orderServiceMock.createOrder).toHaveBeenCalledTimes(1);
    expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderIntentId: "intent_2",
        stripeSessionId: "cs_cart_123",
        stripePaymentIntentId: "pi_cart_123",
      }),
    );
    expect(createdOrders).toEqual([
      { id: "order_1", orderIntentId: "intent_1" },
      { id: "order_2", orderIntentId: "intent_2" },
    ]);
  });

  it("does not invent a payment intent id when Stripe has none", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "order_1", orderIntentId: "intent_1" },
    ]);

    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_cart_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_cart_123",
      payment_status: "paid",
      payment_intent: null,
      metadata: {
        checkoutSessionId: "checkout_session_123",
      },
    });

    orderServiceMock.createOrder.mockResolvedValueOnce({
      id: "order_1",
      orderIntentId: "intent_1",
    });

    await finalizeCartCheckoutSession("cs_cart_123");

    expect(orderServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSessionId: "cs_cart_123",
        stripePaymentIntentId: undefined,
      }),
    );
  });

  it("recreates expired checkout sessions from the immutable snapshot instead of the mutated cart", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 5,
          unitPrice: 19.5,
          substitutions: [{ groupName: "Base", optionName: "Potatoes" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Mild"] }],
          proteinBoost: true,
          notes: "Changed after snapshot",
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_expired_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [{ groupName: "Base", optionName: "Rice" }],
          modifiers: [{ groupName: "Sauce", optionNames: ["Hot"] }],
          proteinBoost: false,
          notes: "Original snapshot",
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_expired_123",
      status: "expired",
      url: null,
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123_retry",
      url: "https://checkout.stripe.test/cs_cart_123_retry",
      payment_intent: null,
    });

    await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(prismaMock.orderIntent.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.orderIntent.create).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            quantity: 2,
            price_data: expect.objectContaining({ unit_amount: 1250 }),
          }),
        ],
        metadata: expect.objectContaining({
          checkoutSessionId: "checkout_session_123",
          cartId: "cart_123",
        }),
      }),
      expect.anything(),
    );
    expect(prismaMock.orderIntent.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["intent_1"] },
      },
      data: {
        status: "SESSION_CREATED",
      },
    });
  });

  it("passes a stable stripe idempotency key for fresh checkout snapshots", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.create.mockResolvedValue({
      id: "intent_1",
      rotationId: "rotation_123",
    });
    prismaMock.checkoutSession.create.mockResolvedValue({
      id: "checkout_session_123",
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
        },
      ],
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123",
      url: "https://checkout.stripe.test/cs_cart_123",
      payment_intent: null,
    });

    await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "checkout_session_123",
      }),
    );
  });

  it("does not recreate checkout when the existing stripe session is already complete", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "CHECKED_OUT",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_complete_123",
      stripePaymentIntentId: "pi_complete_123",
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
      ],
    });
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_complete_123",
      status: "complete",
      url: null,
    });

    await expect(
      createStripeCheckoutSessionForCart({
        cartId: "cart_123",
        userEmail: "customer@example.com",
        userName: "Customer",
        deliveryMethod: "DELIVERY",
        requestId: "request_123",
      }),
    ).rejects.toThrow("Checkout already completed");

    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    expect(prismaMock.checkoutSession.update).not.toHaveBeenCalled();
    expect(prismaMock.orderIntent.updateMany).not.toHaveBeenCalled();
  });

  it("recovers from order intent and checkout snapshot unique races for the same request", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "checkout_session_123",
        cartId: "cart_123",
        userId: "user_123",
        stripeSessionId: null,
        stripePaymentIntentId: null,
        customerEmail: "customer@example.com",
        customerName: "Customer",
        deliveryMethod: "DELIVERY",
        pickupLocation: null,
        items: [
          {
            id: "snapshot_1",
            orderIntentId: "intent_1",
            mealId: "meal_1",
            rotationId: "rotation_123",
            quantity: 2,
            unitPrice: 12.5,
            totalAmount: 25,
            currency: "cad",
            substitutions: [],
            modifiers: [],
            proteinBoost: false,
            notes: null,
            deliveryMethod: "DELIVERY",
            pickupLocation: null,
          },
        ],
      });

    prismaMock.orderIntent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "intent_1",
        rotationId: "rotation_123",
      });

    prismaMock.orderIntent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    prismaMock.checkoutSession.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123",
      url: "https://checkout.stripe.test/cs_cart_123",
      payment_intent: null,
    });

    const session = await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(session.id).toBe("cs_cart_123");
    expect(prismaMock.orderIntent.findFirst).toHaveBeenCalledTimes(2);
    expect(prismaMock.checkoutSession.findFirst).toHaveBeenCalledTimes(2);
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it("recreates from snapshot meal metadata even when the cart now points at a different meal", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_changed",
          quantity: 1,
          unitPrice: 99,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_changed",
            name: "Different Meal",
            slug: "different-meal",
            imageUrl: "https://example.com/different.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_expired_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          mealName: "Jerk Chicken",
          mealSlug: "jerk-chicken",
          mealImageUrl: "https://example.com/meal-1.jpg",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_expired_123",
      status: "expired",
      url: null,
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123_retry",
      url: "https://checkout.stripe.test/cs_cart_123_retry",
      payment_intent: null,
    });

    await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "http://localhost:3000/order/jerk-chicken",
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              product_data: expect.objectContaining({
                name: "Jerk Chicken",
                images: ["https://example.com/meal-1.jpg"],
              }),
            }),
          }),
        ],
      }),
      expect.anything(),
    );
  });

  it("uses a retry-scoped Stripe idempotency key when recreating an expired session", async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_123",
      userId: "user_123",
      settlementMethod: "STRIPE",
      status: "ACTIVE",
      items: [
        {
          id: "item_1",
          mealId: "meal_1",
          quantity: 2,
          unitPrice: 12.5,
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          meal: {
            id: "meal_1",
            name: "Jerk Chicken",
            slug: "jerk-chicken",
            imageUrl: "https://example.com/meal-1.jpg",
          },
          rotationId: "rotation_123",
        },
      ],
    });

    prismaMock.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout_session_123",
      cartId: "cart_123",
      userId: "user_123",
      stripeSessionId: "cs_expired_123",
      stripePaymentIntentId: null,
      customerEmail: "customer@example.com",
      customerName: "Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: null,
      items: [
        {
          id: "snapshot_1",
          orderIntentId: "intent_1",
          mealId: "meal_1",
          mealName: "Jerk Chicken",
          mealSlug: "jerk-chicken",
          mealImageUrl: "https://example.com/meal-1.jpg",
          rotationId: "rotation_123",
          quantity: 2,
          unitPrice: 12.5,
          totalAmount: 25,
          currency: "cad",
          substitutions: [],
          modifiers: [],
          proteinBoost: false,
          notes: null,
          deliveryMethod: "DELIVERY",
          pickupLocation: null,
        },
      ],
    });

    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_expired_123",
      status: "expired",
      url: null,
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_cart_123_retry",
      url: "https://checkout.stripe.test/cs_cart_123_retry",
      payment_intent: null,
    });

    await createStripeCheckoutSessionForCart({
      cartId: "cart_123",
      userEmail: "customer@example.com",
      userName: "Customer",
      deliveryMethod: "DELIVERY",
      requestId: "request_123",
    });

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: "checkout_session_123:retry:cs_expired_123",
      }),
    );
  });
});
