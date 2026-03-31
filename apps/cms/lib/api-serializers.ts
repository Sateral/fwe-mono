import type { ApiCart, ApiMeal, ApiOrder } from "../../../packages/types/src";

import type { mealService } from "@/lib/services/meal.service";
import type { cartService } from "@/lib/services/cart.service";
import type { orderService } from "@/lib/services/order.service";
import type { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

type MealRecord = NonNullable<
  Awaited<ReturnType<typeof mealService.getMealById>>
>;
type CartRecord = NonNullable<
  Awaited<ReturnType<typeof cartService.getCartById>>
>;
type OrderRecord = NonNullable<
  Awaited<ReturnType<typeof orderService.getOrderById>>
>;
type RotationRecord = NonNullable<
  Awaited<ReturnType<typeof weeklyRotationService.getCurrentRotation>>
>;
type RotationSummaryRecord = Awaited<
  ReturnType<typeof weeklyRotationService.getAllRotations>
>[number];
type RotationMutationRecord = NonNullable<
  Awaited<ReturnType<typeof weeklyRotationService.createRotation>>
>;
type AvailableMealsRecord = Awaited<
  ReturnType<typeof weeklyRotationService.getAvailableMeals>
>;

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeMoney(value: { toString(): string } | number): number {
  return Number(value);
}

export function serializeMeal(meal: MealRecord): ApiMeal {
  return {
    id: meal.id,
    name: meal.name,
    slug: meal.slug,
    description: meal.description,
    ingredients: meal.ingredients,
    imageUrl: meal.imageUrl,
    isFeatured: meal.isFeatured,
    price: serializeMoney(meal.price),
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    fiber: meal.fiber,
    createdAt: meal.createdAt.toISOString(),
    updatedAt: meal.updatedAt.toISOString(),
    substitutionGroups: (meal.substitutionGroups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      mealId: group.mealId,
      options: (group.options ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        isDefault: option.isDefault,
        priceAdjustment: serializeMoney(option.priceAdjustment),
        calorieAdjust: option.calorieAdjust,
        proteinAdjust: option.proteinAdjust,
        carbsAdjust: option.carbsAdjust,
        fatAdjust: option.fatAdjust,
        fiberAdjust: option.fiberAdjust,
        groupId: option.groupId,
      })),
    })),
    modifierGroups: (meal.modifierGroups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      mealId: group.mealId,
      options: (group.options ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        extraPrice: serializeMoney(option.extraPrice),
        modifierGroupId: option.modifierGroupId,
      })),
    })),
    tags: (meal.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
    })),
  };
}

export function serializeMeals(meals: MealRecord[]): ApiMeal[] {
  return meals.map(serializeMeal);
}

export function serializeOrder(order: OrderRecord): ApiOrder {
  return {
    id: order.id,
    userId: order.userId,
    mealId: order.mealId,
    mealName: order.mealName,
    settlementMethod: order.settlementMethod,
    orderIntentId: order.orderIntentId,
    checkoutSessionId: order.checkoutSessionId,
    orderGroupId: order.orderGroupId,
    assignedByChef:
      order.orderIntent?.clientRequestId?.startsWith("assignment:") ?? false,
    quantity: order.quantity,
    unitPrice: serializeMoney(order.unitPrice),
    totalAmount: serializeMoney(order.totalAmount),
    substitutions: order.substitutions.map((s) => ({
      id: s.id,
      groupName: s.groupName,
      optionName: s.optionName,
      groupId: s.groupId,
      optionId: s.optionId,
    })),
    modifiers: order.modifiers.map((m) => ({
      id: m.id,
      groupName: m.groupName,
      optionName: m.optionName,
      groupId: m.groupId,
      optionId: m.optionId,
    })),
    notes: order.notes,
    deliveryMethod: order.deliveryMethod,
    pickupLocation: order.pickupLocation,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    paidAt: serializeDate(order.paidAt),
    refundedAt: serializeDate(order.refundedAt),
    refundAmount: serializeMoney(order.refundAmount),
    stripeSessionId: order.stripeSessionId,
    stripePaymentIntentId: order.stripePaymentIntentId,
    stripeChargeId: order.stripeChargeId,
    stripeRefundId: order.stripeRefundId,
    stripeBalanceTransactionId: order.stripeBalanceTransactionId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerDeliveryAddress: order.customerDeliveryAddress,
    customerDeliveryCity: order.customerDeliveryCity,
    customerDeliveryPostal: order.customerDeliveryPostal,
    customerDeliveryNotes: order.customerDeliveryNotes,
    customerIsGuest: order.customerIsGuest,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    meal: order.meal ? serializeMeal(order.meal) : null,
    rotationId: order.rotationId,
    user: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
        }
      : undefined,
  };
}

export function serializeCart(cart: CartRecord): ApiCart {
  return {
    id: cart.id,
    settlementMethod: cart.settlementMethod,
    status: cart.status,
    userId: cart.userId,
    rotationId: cart.items[0]?.rotationId ?? null,
    items: cart.items.map((item) => ({
      id: item.id,
      mealId: item.mealId,
      rotationId: item.rotationId,
      quantity: item.quantity,
      unitPrice: serializeMoney(item.unitPrice),
      substitutions: item.substitutions.map((s) => ({
        id: s.id,
        groupId: s.groupId,
        groupName: s.groupName,
        optionId: s.optionId,
        optionName: s.optionName,
      })),
      modifiers: item.modifiers.map((m) => ({
        id: m.id,
        groupId: m.groupId,
        groupName: m.groupName,
        optionId: m.optionId,
        optionName: m.optionName,
      })),
      notes: item.notes,
      meal: {
        id: item.meal.id,
        name: item.meal.name,
        slug: item.meal.slug,
        imageUrl: item.meal.imageUrl,
      },
    })),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export function serializeOrders(orders: OrderRecord[]): ApiOrder[] {
  return orders.map(serializeOrder);
}

export function serializeRotation(rotation: RotationRecord) {
  const { rotationPeriod, ...rest } = rotation;

  return {
    ...rest,
    weekStart: rest.weekStart.toISOString(),
    weekEnd: rest.weekEnd.toISOString(),
    orderCutoff: rest.orderCutoff.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    meals: serializeMeals(rest.meals),
  };
}

export function serializeRotationSummary(
  rotation: RotationSummaryRecord | RotationMutationRecord,
) {
  const { rotationPeriod, ...rest } = rotation;

  return {
    ...rest,
    weekStart: rest.weekStart.toISOString(),
    weekEnd: rest.weekEnd.toISOString(),
    orderCutoff: rest.orderCutoff.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    meals: rest.meals.map((meal) => ({
      ...meal,
      price: serializeMoney(meal.price),
      createdAt: meal.createdAt.toISOString(),
      updatedAt: meal.updatedAt.toISOString(),
    })),
  };
}

export function serializeAvailableMeals(result: AvailableMealsRecord) {
  return {
    ...result,
    meals: serializeMeals(result.meals),
    cutoffTime: result.cutoffTime.toISOString(),
  };
}
