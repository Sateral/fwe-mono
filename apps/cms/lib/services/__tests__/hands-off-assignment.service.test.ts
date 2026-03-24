import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
  orderIntent: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const weeklyRotationServiceMock = vi.hoisted(() => ({
  getCurrentRotation: vi.fn(),
}));

const mealPlanServiceMock = vi.hoisted(() => ({
  getPlanSummaryByUserId: vi.fn(),
  redeemCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("../weekly-rotation.service", () => ({
  weeklyRotationService: weeklyRotationServiceMock,
}));

vi.mock("../meal-plan.service", () => ({
  mealPlanService: mealPlanServiceMock,
}));

import { handsOffAssignmentService } from "../hands-off-assignment.service";

describe("hands-off-assignment.service", () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockReset();
    prismaMock.orderIntent.findFirst.mockReset();
    prismaMock.orderIntent.create.mockReset();
    prismaMock.order.findMany.mockReset();
    prismaMock.order.findFirst.mockReset();
    prismaMock.order.create.mockReset();
    prismaMock.$transaction.mockReset();
    weeklyRotationServiceMock.getCurrentRotation.mockReset();
    mealPlanServiceMock.getPlanSummaryByUserId.mockReset();
    mealPlanServiceMock.redeemCart.mockReset();
  });

  it("creates assignments for hands-off users from the active rotation", async () => {
    weeklyRotationServiceMock.getCurrentRotation.mockResolvedValue({
      id: "rotation_123",
      weekStart: new Date("2026-03-23T00:00:00.000Z"),
      meals: [
        {
          id: "meal_1",
          name: "Spicy Jerk Chicken",
          slug: "spicy-jerk-chicken",
          description: "High protein meal",
          imageUrl: null,
          price: 12.5,
          tags: [{ id: "tag_1", name: "spicy", color: "red", icon: "pepper" }],
        },
        {
          id: "meal_2",
          name: "Garlic Shrimp Bowl",
          slug: "garlic-shrimp-bowl",
          description: "Contains shellfish",
          imageUrl: null,
          price: 13.5,
          tags: [{ id: "tag_2", name: "shellfish", color: "blue", icon: "fish" }],
        },
        {
          id: "meal_3",
          name: "High Protein Turkey Chili",
          slug: "turkey-chili",
          description: "High protein comfort meal",
          imageUrl: null,
          price: 11,
          tags: [{ id: "tag_3", name: "high-protein", color: "green", icon: "bolt" }],
        },
      ],
    });
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_123",
        name: "Customer",
        email: "customer@example.com",
        flavorProfile: {
          involvement: "HANDS_OFF",
          goals: ["high-protein"],
          restrictions: ["shellfish"],
          preferences: ["spicy"],
        },
      },
    ]);
    prismaMock.order.findMany.mockResolvedValue([]);
    mealPlanServiceMock.getPlanSummaryByUserId.mockResolvedValue({
      id: "plan_123",
      weeklyCreditCap: 2,
      remainingCredits: 6,
      currentWeekCreditsRemaining: 2,
    });
    mealPlanServiceMock.redeemCart.mockResolvedValue({
      mealPlanId: "plan_123",
      creditsRedeemed: 2,
    });
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.orderIntent.findFirst.mockResolvedValue(null);
    prismaMock.orderIntent.create.mockResolvedValueOnce({ id: "intent_1" }).mockResolvedValueOnce({ id: "intent_2" });
    prismaMock.order.findFirst.mockResolvedValue(null);
    prismaMock.order.create.mockResolvedValue({ id: "order_1" });

    const result = await handsOffAssignmentService.assignCurrentRotation();

    expect(result.assignedMeals).toHaveLength(2);
    expect(result.assignedMeals.map((meal) => meal.mealId)).toEqual([
      "meal_1",
      "meal_3",
    ]);
    expect(mealPlanServiceMock.redeemCart).toHaveBeenCalledWith(
      {
        id: "assignment:user_123:rotation_123",
        userId: "user_123",
        items: [
          { id: "assignment-item:user_123:meal_1", quantity: 1 },
          { id: "assignment-item:user_123:meal_3", quantity: 1 },
        ],
      },
      expect.any(Date),
      expect.anything(),
    );
  });
});
