import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  getServerSession: vi.fn(),
}));

const cmsApiMock = vi.hoisted(() => ({
  cartsApi: {
    create: vi.fn(),
    checkout: vi.fn(),
  },
  mealsApi: {
    getActiveRotation: vi.fn(),
  },
}));

const rateLimitMock = vi.hoisted(() => ({
  checkoutRateLimiter: {
    check: vi.fn(),
  },
}));

vi.mock("@/lib/auth-server", () => authMock);
vi.mock("@/lib/cms-api", () => cmsApiMock);
vi.mock("@/lib/rate-limit", () => rateLimitMock);

import { POST } from "./route";

describe("web checkout route", () => {
  beforeEach(() => {
    authMock.getServerSession.mockReset();
    cmsApiMock.cartsApi.create.mockReset();
    cmsApiMock.cartsApi.checkout.mockReset();
    cmsApiMock.mealsApi.getActiveRotation.mockReset();
    rateLimitMock.checkoutRateLimiter.check.mockReset();
  });

  it("forwards requestId into cart creation so retries can reuse the same cart", async () => {
    rateLimitMock.checkoutRateLimiter.check.mockResolvedValue({ success: true });
    authMock.getServerSession.mockResolvedValue({
      user: {
        id: "user_123",
        email: "customer@example.com",
        name: "Customer",
      },
    });
    cmsApiMock.mealsApi.getActiveRotation.mockResolvedValue({
      id: "rotation_123",
    });
    cmsApiMock.cartsApi.create.mockResolvedValue({ id: "cart_123" });
    cmsApiMock.cartsApi.checkout.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/cs_123",
    });

    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
          mealId: "meal_1",
          quantity: 2,
          deliveryMethod: "DELIVERY",
        }),
      }) as never,
    );

    expect(response?.status).toBe(200);
    expect(cmsApiMock.cartsApi.create).toHaveBeenCalledWith("user_123", {
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      rotationId: "rotation_123",
      settlementMethod: "STRIPE",
      items: [
        {
          mealId: "meal_1",
          quantity: 2,
          substitutions: undefined,
          modifiers: undefined,
          proteinBoost: false,
          notes: undefined,
        },
      ],
    });
  });

  it("allows anonymous checkout when a guest payload is provided", async () => {
    rateLimitMock.checkoutRateLimiter.check.mockResolvedValue({ success: true });
    authMock.getServerSession.mockResolvedValue(null);
    cmsApiMock.mealsApi.getActiveRotation.mockResolvedValue({
      id: "rotation_123",
    });
    cmsApiMock.cartsApi.create.mockResolvedValue({ id: "cart_guest_123" });
    cmsApiMock.cartsApi.checkout.mockResolvedValue({
      id: "cs_guest_123",
      url: "https://checkout.stripe.test/cs_guest_123",
    });

    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
          mealId: "meal_1",
          quantity: 2,
          deliveryMethod: "DELIVERY",
          guest: {
            name: "Guest Customer",
            email: "guest@example.com",
          },
        }),
      }) as never,
    );

    expect(response?.status).toBe(200);
    expect(cmsApiMock.cartsApi.create).toHaveBeenCalledWith(undefined, {
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      rotationId: "rotation_123",
      settlementMethod: "STRIPE",
      guest: {
        name: "Guest Customer",
        email: "guest@example.com",
      },
      items: [
        {
          mealId: "meal_1",
          quantity: 2,
          substitutions: undefined,
          modifiers: undefined,
          proteinBoost: false,
          notes: undefined,
        },
      ],
    });
    expect(cmsApiMock.cartsApi.checkout).toHaveBeenCalledWith("cart_guest_123", {
      userEmail: "guest@example.com",
      userName: "Guest Customer",
      deliveryMethod: "DELIVERY",
      pickupLocation: undefined,
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
    });
  });

  it("forwards meal plan settlement when requested", async () => {
    rateLimitMock.checkoutRateLimiter.check.mockResolvedValue({ success: true });
    authMock.getServerSession.mockResolvedValue({
      user: {
        id: "user_123",
        email: "customer@example.com",
        name: "Customer",
      },
    });
    cmsApiMock.mealsApi.getActiveRotation.mockResolvedValue({
      id: "rotation_123",
    });
    cmsApiMock.cartsApi.create.mockResolvedValue({ id: "cart_plan_123" });
    cmsApiMock.cartsApi.checkout.mockResolvedValue({
      id: "meal-plan-cart_plan_123",
      url: null,
    });

    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
          mealId: "meal_1",
          quantity: 2,
          deliveryMethod: "DELIVERY",
          settlementMethod: "MEAL_PLAN_CREDITS",
        }),
      }) as never,
    );

    expect(response?.status).toBe(200);
    expect(cmsApiMock.cartsApi.create).toHaveBeenCalledWith("user_123", {
      requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
      rotationId: "rotation_123",
      settlementMethod: "MEAL_PLAN_CREDITS",
      guest: undefined,
      items: [
        {
          mealId: "meal_1",
          quantity: 2,
          substitutions: undefined,
          modifiers: undefined,
          proteinBoost: false,
          notes: undefined,
        },
      ],
    });
  });

  it("returns a 409 when meal plan checkout is rejected by business rules", async () => {
    rateLimitMock.checkoutRateLimiter.check.mockResolvedValue({ success: true });
    authMock.getServerSession.mockResolvedValue({
      user: {
        id: "user_123",
        email: "customer@example.com",
        name: "Customer",
      },
    });
    cmsApiMock.mealsApi.getActiveRotation.mockResolvedValue({
      id: "rotation_123",
    });
    cmsApiMock.cartsApi.create.mockResolvedValue({ id: "cart_plan_123" });
    cmsApiMock.cartsApi.checkout.mockRejectedValue(
      new Error("Hybrid carts are not supported in v1"),
    );

    const response = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: "4db6c5c0-bb24-4d18-b6f6-e165cdb4e0b3",
          mealId: "meal_1",
          quantity: 2,
          deliveryMethod: "DELIVERY",
          settlementMethod: "MEAL_PLAN_CREDITS",
        }),
      }) as never,
    );

    expect(response?.status).toBe(409);
  });
});
