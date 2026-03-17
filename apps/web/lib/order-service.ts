/**
 * Order Service
 *
 * This module provides order management functions for the commerce app.
 * All data is fetched from and sent to the CMS API - no direct database access.
 */

import type { ApiOrderSession, FulfillmentStatus } from "@fwe/types";

import { ordersApi, type ApiOrder, type CreateOrderInput } from "@/lib/cms-api";

// Re-export types for convenience
export type { ApiOrder, CreateOrderInput };
export type Order = ApiOrder;
export type OrderSession = ApiOrderSession;

// Re-export OrderSubstitution type matching the API
export interface OrderSubstitution {
  groupName: string;
  optionName: string;
}

/**
 * Creates a new order after successful payment.
 * Called by the Stripe webhook handler.
 */
export async function createOrder(input: CreateOrderInput): Promise<ApiOrder> {
  return ordersApi.create(input);
}

/**
 * Retrieves an order by its Stripe checkout session ID.
 * Used by the success page to show order confirmation.
 */
export async function getOrderByStripeSessionId(
  stripeSessionId: string,
): Promise<ApiOrderSession | null> {
  return ordersApi.getByStripeSession(stripeSessionId);
}

/**
 * Ensures an order exists for a Stripe checkout session.
 */
export async function ensureOrderByStripeSession(
  stripeSessionId: string,
): Promise<ApiOrderSession | null> {
  return ordersApi.ensureByStripeSession(stripeSessionId);
}

/**
 * Retrieves an order by its ID.
 */
export async function getOrderById(orderId: string): Promise<ApiOrder | null> {
  return ordersApi.getById(orderId);
}

/**
 * Retrieves all orders for a specific user.
 */
export async function getUserOrders(userId: string): Promise<ApiOrder[]> {
  return ordersApi.getUserOrders(userId);
}

/**
 * Updates the status of an order.
 */
export async function updateFulfillmentStatus(
  orderId: string,
  fulfillmentStatus: FulfillmentStatus,
): Promise<ApiOrder> {
  return ordersApi.updateFulfillmentStatus(orderId, fulfillmentStatus);
}
