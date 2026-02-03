"use server";

import { orderService, type OrderStatus } from "@/lib/services/order.service";

// ============================================
// Types
// ============================================

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  rotationId?: string;
}

/**
 * Order with relations - derived from the service return type.
 */
export type OrderWithRelations = Awaited<
  ReturnType<typeof orderService.getOrdersWithFilters>
>[0];

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
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return await orderService.updateOrderStatus(orderId, status);
}

/**
 * Get order counts by status for dashboard badges.
 */
export async function getOrderStats() {
  return await orderService.getOrderStatsByStatus();
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
