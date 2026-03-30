"use server";

import { Role } from "@fwe/db";
import type { FulfillmentStatus } from "@fwe/validators";
import { headers } from "next/headers";

import type { OrderFilters } from "@/lib/types/order-types";
import { auth } from "@/lib/auth";
import { orderService } from "@/lib/services/order.service";
import { toPlainObject } from "@/lib/utils";

async function requireAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

// ============================================
// Server Actions
// ============================================

/**
 * Get all orders with optional filtering.
 */
export async function getOrders(filters?: OrderFilters) {
  return toPlainObject(await orderService.getOrdersWithFilters(filters));
}

/**
 * Get a single order by ID with full relations.
 */
export async function getOrder(id: string) {
  return toPlainObject(await orderService.getOrderById(id));
}

/**
 * Update an order's status.
 */
export async function updateFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: FulfillmentStatus,
  reason?: string,
) {
  const session = await requireAdminSession();
  return toPlainObject(
    await orderService.updateFulfillmentStatus(
      orderId,
      fulfillmentStatus,
      session.user.id,
      reason,
    ),
  );
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
  return toPlainObject(
    await orderService.getOrdersForDeliveryWeek(deliveryWeekDate),
  );
}

/**
 * Get production summary from orders.
 * Only requires meal info and quantity - accepts any order type with these fields.
 */
export async function getProductionSummary(
  orders: Array<{
    mealId: string;
    quantity: number;
    meal: { name: string } | null;
  }>,
) {
  return orderService.getProductionSummary(orders);
}

export async function getOrdersByRotation(rotationId: string) {
  return toPlainObject(await orderService.getOrdersByRotationId(rotationId));
}
