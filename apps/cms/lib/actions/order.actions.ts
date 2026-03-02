"use server";

import type { FulfillmentStatus } from "@fwe/validators";

import type { OrderFilters } from "@/lib/types/order-types";
import { orderService } from "@/lib/services/order.service";

// ============================================
// Server Actions
// ============================================

/**
 * Get all orders with optional filtering.
 */
export async function getOrders(filters?: OrderFilters) {
  return await orderService.getOrdersWithFilters(filters);
}

/**
 * Get a single order by ID with full relations.
 */
export async function getOrder(id: string) {
  return await orderService.getOrderById(id);
}

/**
 * Update an order's status.
 */
export async function updateFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: FulfillmentStatus,
) {
  return await orderService.updateFulfillmentStatus(orderId, fulfillmentStatus);
}

/**
 * Get order counts by status for dashboard badges.
 */
export async function getFulfillmentStats() {
  return await orderService.getOrderStatsByFulfillmentStatus();
}

/**
 * Get orders for a specific delivery week.
 */
export async function getOrdersForDeliveryWeek(deliveryWeekDate: Date) {
  return await orderService.getOrdersForDeliveryWeek(deliveryWeekDate);
}

/**
 * Get production summary from orders.
 * Only requires meal info and quantity - accepts any order type with these fields.
 */
export async function getProductionSummary(
  orders: Array<{
    mealId: string;
    quantity: number;
    meal: { name: string; mealType: string } | null;
  }>,
) {
  return orderService.getProductionSummary(orders);
}

export async function getOrdersByRotation(rotationId: string) {
  return await orderService.getOrdersByRotationId(rotationId);
}
