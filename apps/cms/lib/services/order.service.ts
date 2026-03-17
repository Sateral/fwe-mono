import type {
  CreateOrderInput,
  FulfillmentStatus,
  PaymentStatus,
} from "@fwe/validators";
import prisma from "../prisma";
import {
  getOrderingWindowForDeliveryWeek,
  weeklyRotationService,
} from "./weekly-rotation.service";

// ============================================
// Order Service
// ============================================

export const orderService = {
  /**
   * Shared include for order relations and customization metadata.
   */
  orderInclude: {
    meal: {
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
    },
    user: true,
  },
  /**
   * Creates a new order after successful payment.
   * Called by the Stripe webhook handler.
   */
  async createOrder(input: CreateOrderInput) {
    console.log(`[OrderService] Creating order for user ${input.userId}`);

    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          ...(input.orderIntentId ? [{ orderIntentId: input.orderIntentId }] : []),
        ],
      },
      include: this.orderInclude,
    });

    if (existingOrder) {
      console.log(
        `[OrderService] Order already exists for session ${input.stripeSessionId}`,
      );
      return existingOrder;
    }

    const rotationExists = await prisma.weeklyRotation.findUnique({
      where: { id: input.rotationId },
      select: { id: true },
    });

    let rotationId = input.rotationId;
    if (!rotationExists) {
      console.warn(
        `[OrderService] Rotation ${input.rotationId} not found. Falling back to ordering week rotation.`,
      );
      const { rotation } =
        await weeklyRotationService.getOrCreateOrderingRotation();
      rotationId = rotation.id;
    }

    try {
      const paidAt = new Date();
      const order = await prisma.order.create({
        data: {
          userId: input.userId,
          mealId: input.mealId,
          rotationId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          customerDeliveryAddress: input.customerDeliveryAddress,
          customerDeliveryCity: input.customerDeliveryCity,
          customerDeliveryPostal: input.customerDeliveryPostal,
          customerDeliveryNotes: input.customerDeliveryNotes,
          customerIsGuest: input.customerIsGuest ?? false,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalAmount: input.totalAmount,
          substitutions: input.substitutions as unknown as object[] | undefined,
          modifiers: input.modifiers as unknown as object[] | undefined,
          orderIntentId: input.orderIntentId,
          proteinBoost: input.proteinBoost ?? false,
          notes: input.notes,
          deliveryMethod: input.deliveryMethod ?? "DELIVERY",
          pickupLocation: input.pickupLocation,
          paymentStatus: "PAID",
          fulfillmentStatus: "NEW",
          currency: input.currency ?? "cad",
          paidAt,
          stripeSessionId: input.stripeSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          stripeChargeId: input.stripeChargeId,
          stripeBalanceTransactionId: input.stripeBalanceTransactionId,
        },
        include: this.orderInclude,
      });

      console.log(`[OrderService] Order ${order.id} created successfully`);
      return order;
    } catch (error) {
      const recoveredOrder = await prisma.order.findFirst({
        where: {
          OR: [
            ...(input.orderIntentId ? [{ orderIntentId: input.orderIntentId }] : []),
          ],
        },
        include: this.orderInclude,
      });

      if (recoveredOrder) {
        console.warn(
          `[OrderService] Order already created during race for session ${input.stripeSessionId}`,
        );
        return recoveredOrder;
      }

      throw error;
    }
  },

  /**
   * Retrieves an order by its ID.
   */
  async getOrderById(orderId: string) {
    console.log(`[OrderService] Fetching order ${orderId}`);

    return await prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });
  },

  /**
   * Retrieves an order by its Stripe checkout session ID.
   * Used by the success page to show order confirmation.
   */
  async getOrderByStripeSessionId(stripeSessionId: string) {
    console.log(
      `[OrderService] Fetching order by Stripe session ${stripeSessionId}`,
    );

    return await prisma.order.findFirst({
      where: { stripeSessionId },
      orderBy: { createdAt: "asc" },
      include: this.orderInclude,
    });
  },

  async getOrdersByStripeSessionId(stripeSessionId: string) {
    return await prisma.order.findMany({
      where: { stripeSessionId },
      orderBy: { createdAt: "asc" },
      include: this.orderInclude,
    });
  },

  /**
   * Retrieves all orders for a specific user.
   * Ordered by creation date, newest first.
   */
  async getUserOrders(userId: string) {
    console.log(`[OrderService] Fetching orders for user ${userId}`);

    return await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: this.orderInclude,
    });
  },

  /**
   * Updates the status of an order.
   * Used by CMS dashboard for order management.
   */
  async updateFulfillmentStatus(
    orderId: string,
    fulfillmentStatus: FulfillmentStatus,
  ) {
    console.log(
      `[OrderService] Updating order ${orderId} to fulfillment status ${fulfillmentStatus}`,
    );

    return await prisma.order.update({
      where: { id: orderId },
      data: { fulfillmentStatus },
      include: this.orderInclude,
    });
  },

  /**
   * Retrieves all orders (for CMS dashboard).
   * Ordered by creation date, newest first.
   */
  async getAllOrders() {
    console.log(`[OrderService] Fetching all orders`);

    return await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: this.orderInclude,
    });
  },

  /**
   * Retrieves orders with optional filters.
   * Supports filtering by status, date range, and search term.
   */
  async getOrdersWithFilters(filters?: {
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    rotationId?: string;
  }) {
    console.log(`[OrderService] Fetching orders with filters:`, filters);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Payment status filter
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    // Fulfillment status filter
    if (filters?.fulfillmentStatus) {
      where.fulfillmentStatus = filters.fulfillmentStatus;
    }

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // End of the day
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Search filter (search by customer name or email)
    if (filters?.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    if (filters?.rotationId) {
      where.rotationId = filters.rotationId;
    }

    return await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: this.orderInclude,
    });
  },

  /**
   * Get order counts grouped by status.
   * Used for dashboard badges and quick filters.
   */
  async getOrderStatsByFulfillmentStatus() {
    console.log(`[OrderService] Fetching order stats by fulfillment status`);

    const stats = await prisma.order.groupBy({
      by: ["fulfillmentStatus"],
      _count: true,
    });

    const result: Record<FulfillmentStatus, number> = {
      NEW: 0,
      PREPARING: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    for (const stat of stats) {
      result[stat.fulfillmentStatus as FulfillmentStatus] = stat._count;
    }

    return result;
  },

  /**
   * Get orders for a specific delivery week.
   * Logic: Orders placed in Week N (Wed-Tue) are for Delivery Week N+1.
   * So we filter for orders created in (DeliveryWeek - 7 days) to (DeliveryWeek).
   * Range: [Wednesday 00:00, Following Wednesday 00:00)
   */
  async getOrdersForDeliveryWeek(deliveryWeekStart: Date) {
    console.log(
      `[OrderService] Fetching orders for delivery week starting ${deliveryWeekStart.toISOString()}`,
    );

    // Delivery Week starts on Wednesday.
    // The ordering window for this week was the PREVIOUS week (7 days prior).
    const { windowStart, windowEnd } =
      getOrderingWindowForDeliveryWeek(deliveryWeekStart);

    return await prisma.order.findMany({
      where: {
        createdAt: {
          gte: windowStart,
          lt: windowEnd,
        },
        paymentStatus: "PAID",
        fulfillmentStatus: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      include: this.orderInclude,
    });
  },

  /**
   * Retrieves all orders associated with a specific rotation.
   * Includes full user profile with delivery info for packing lists.
   */
  async getOrdersByRotationId(rotationId: string) {
    console.log(`[OrderService] Fetching orders for rotation ${rotationId}`);
    return await prisma.order.findMany({
      where: { rotationId },
      orderBy: { meal: { name: "asc" } },
      include: {
        meal: {
          include: {
            substitutionGroups: {
              include: {
                options: true,
              },
            },
            modifierGroups: {
              include: {
                options: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryPostal: true,
            deliveryNotes: true,
          },
        },
      },
    });
  },

  /**
   * Generates a production summary from a list of orders.
   * Aggregates quantities by meal.
   */
  getProductionSummary(orders: any[]) {
    const summary = new Map<
      string,
      { mealId: string; mealName: string; count: number; isRotating: boolean }
    >();

    for (const order of orders) {
      if (order.paymentStatus !== "PAID") continue;
      if (order.fulfillmentStatus === "CANCELLED") continue;
      if (!order.meal) continue;

      const existing = summary.get(order.mealId);
      if (existing) {
        existing.count += order.quantity;
      } else {
        summary.set(order.mealId, {
          mealId: order.mealId,
          mealName: order.meal.name,
          count: order.quantity,
          isRotating: order.meal.mealType === "ROTATING",
        });
      }
    }

    return Array.from(summary.values()).sort((a, b) => b.count - a.count);
  },
};
