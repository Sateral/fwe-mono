import type { CreateOrderInput } from "@fwe/validators";

import prisma from "@/lib/prisma";
import { orderService } from "./order.service";

// ============================================
// Types
// ============================================

export type FailedOrderStatus =
  | "PENDING"
  | "RETRYING"
  | "RESOLVED"
  | "ABANDONED";

export interface CreateFailedOrderInput {
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  customerEmail?: string;
  customerName?: string;
  orderData: CreateOrderInput;
  errorMessage: string;
  errorCode?: string;
}

// ============================================
// Failed Order Service (Dead Letter Queue)
// ============================================

export const failedOrderService = {
  /**
   * Records a failed order attempt for later recovery.
   * Called when order creation fails after successful payment.
   */
  async createFailedOrder(input: CreateFailedOrderInput) {
    console.log(
      `[FailedOrderService] 🚨 Recording failed order for session ${input.stripeSessionId}`,
    );

    // Check if already exists (idempotency)
    const existing = await prisma.failedOrder.findUnique({
      where: { stripeSessionId: input.stripeSessionId },
    });

    if (existing) {
      console.log(
        `[FailedOrderService] Failed order already exists, updating retry count`,
      );
      return await prisma.failedOrder.update({
        where: { stripeSessionId: input.stripeSessionId },
        data: {
          retryCount: { increment: 1 },
          errorMessage: input.errorMessage,
          errorCode: input.errorCode,
        },
      });
    }

    return await prisma.failedOrder.create({
      data: {
        stripeSessionId: input.stripeSessionId,
        stripePaymentIntentId: input.stripePaymentIntentId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        orderData: input.orderData as object,
        errorMessage: input.errorMessage,
        errorCode: input.errorCode,
        status: "PENDING",
      },
    });
  },

  /**
   * Gets all pending failed orders for admin review.
   */
  async getPendingFailedOrders() {
    console.log(`[FailedOrderService] Fetching pending failed orders`);

    return await prisma.failedOrder.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Gets all failed orders with optional status filter.
   */
  async getAllFailedOrders(status?: FailedOrderStatus) {
    console.log(
      `[FailedOrderService] Fetching failed orders (status: ${status || "all"})`,
    );

    return await prisma.failedOrder.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Gets a single failed order by ID.
   */
  async getFailedOrderById(id: string) {
    return await prisma.failedOrder.findUnique({
      where: { id },
    });
  },

  /**
   * Gets a failed order by Stripe session ID.
   */
  async getByStripeSessionId(stripeSessionId: string) {
    return await prisma.failedOrder.findUnique({
      where: { stripeSessionId },
    });
  },

  /**
   * Attempts to retry creating an order from a failed order record.
   * Returns the created order if successful.
   */
  async retryFailedOrder(id: string, adminUserId?: string) {
    console.log(`[FailedOrderService] Attempting retry for failed order ${id}`);

    const failedOrder = await prisma.failedOrder.findUnique({
      where: { id },
    });

    if (!failedOrder) {
      throw new Error("Failed order not found");
    }

    if (failedOrder.status === "RESOLVED") {
      throw new Error("Failed order already resolved");
    }

    // Mark as retrying
    await prisma.failedOrder.update({
      where: { id },
      data: { status: "RETRYING", retryCount: { increment: 1 } },
    });

    try {
      // Attempt to create the order
      const orderData = failedOrder.orderData as unknown as CreateOrderInput;
      const order = await orderService.createOrder(orderData);

      // Mark as resolved
      await prisma.failedOrder.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: adminUserId,
        },
      });

      console.log(
        `[FailedOrderService] ✅ Successfully recovered order ${order.id}`,
      );
      return order;
    } catch (error) {
      // Revert to pending with updated error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await prisma.failedOrder.update({
        where: { id },
        data: {
          status: "PENDING",
          errorMessage: errorMessage,
        },
      });
      throw error;
    }
  },

  /**
   * Marks a failed order as abandoned (e.g., after refund).
   */
  async abandonFailedOrder(id: string, adminUserId?: string) {
    console.log(`[FailedOrderService] Marking failed order ${id} as abandoned`);

    return await prisma.failedOrder.update({
      where: { id },
      data: {
        status: "ABANDONED",
        resolvedAt: new Date(),
        resolvedBy: adminUserId,
      },
    });
  },

  /**
   * Gets count of pending failed orders (for dashboard alerts).
   */
  async getPendingCount() {
    return await prisma.failedOrder.count({
      where: { status: "PENDING" },
    });
  },
};
