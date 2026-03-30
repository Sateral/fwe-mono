import type { CreateFailedOrderInput, CreateOrderInput } from "@fwe/validators";

import prisma from "../prisma";
import { sendFailedOrderAlertWebhook } from "./failed-order-alert.service";
import { orderService } from "./order.service";

// ============================================
// Types
// ============================================

export type FailedOrderStatus =
  | "PENDING"
  | "RETRYING"
  | "RESOLVED"
  | "ABANDONED";

function parseFailedOrderPayload(
  raw: unknown,
): { orders: CreateOrderInput[] } {
  const data = raw as { orders?: CreateOrderInput[] } | CreateOrderInput;
  if (data && typeof data === "object" && "orders" in data && Array.isArray(data.orders)) {
    return { orders: data.orders };
  }
  return { orders: [data as CreateOrderInput] };
}

async function notifyIfNeeded(
  row: {
    id: string;
    adminNotifiedAt: Date | null;
    stripeSessionId: string;
    stripePaymentIntentId: string | null;
    customerEmail: string | null;
    customerName: string | null;
    errorMessage: string;
  },
) {
  if (row.adminNotifiedAt) {
    return row;
  }
  const ok = await sendFailedOrderAlertWebhook({
    failedOrderId: row.id,
    stripeSessionId: row.stripeSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    errorMessage: row.errorMessage,
  });
  if (!ok) {
    return row;
  }
  return prisma.failedOrder.update({
    where: { id: row.id },
    data: { adminNotifiedAt: new Date() },
  });
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

    const existing = await prisma.failedOrder.findUnique({
      where: { stripeSessionId: input.stripeSessionId },
    });

    if (existing) {
      console.log(
        `[FailedOrderService] Failed order already exists, updating retry count`,
      );
      const updated = await prisma.failedOrder.update({
        where: { stripeSessionId: input.stripeSessionId },
        data: {
          retryCount: { increment: 1 },
          errorMessage: input.errorMessage,
          errorCode: input.errorCode,
          orderData: input.orderData as object,
        },
      });
      return notifyIfNeeded(updated);
    }

    const created = await prisma.failedOrder.create({
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
    return notifyIfNeeded(created);
  },

  /**
   * Retry webhook delivery for rows that were persisted but not acknowledged by ops.
   */
  async retryPendingAdminNotifications(limit = 25) {
    const rows = await prisma.failedOrder.findMany({
      where: {
        status: "PENDING",
        adminNotifiedAt: null,
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let notified = 0;
    for (const row of rows) {
      const next = await notifyIfNeeded(row);
      if (next.adminNotifiedAt) {
        notified += 1;
      }
    }
    return { processed: rows.length, notified };
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
   * Attempts to retry creating orders from a failed order record.
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

    const { orders } = parseFailedOrderPayload(failedOrder.orderData);
    if (orders.length === 0) {
      throw new Error("No order payloads to retry; snapshot may be missing.");
    }

    await prisma.failedOrder.update({
      where: { id },
      data: { status: "RETRYING", retryCount: { increment: 1 } },
    });

    try {
      const created: Awaited<ReturnType<typeof orderService.createOrder>>[] = [];
      for (const payload of orders) {
        const order = await orderService.createOrder(payload);
        created.push(order);
      }

      await prisma.failedOrder.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: adminUserId,
        },
      });

      const last = created[created.length - 1]!;
      console.log(
        `[FailedOrderService] ✅ Successfully recovered ${created.length} order(s); last id ${last.id}`,
      );
      return last;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await prisma.failedOrder.update({
        where: { id },
        data: {
          status: "PENDING",
          errorMessage,
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
