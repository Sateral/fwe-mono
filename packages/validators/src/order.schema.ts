import { z } from "zod";

import { settlementMethodSchema } from "./checkout.schema";

// ============================================
// Order Schemas
// ============================================

/**
 * Schema for order substitution data.
 */
export const orderSubstitutionSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  optionName: z.string().min(1, "Option name is required"),
  groupId: z.string().optional(),
  optionId: z.string().optional(),
});

/** One row per selected modifier option (flat, not nested). */
export const orderModifierSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  optionName: z.string().min(1, "Option name is required"),
  groupId: z.string().optional(),
  optionId: z.string().optional(),
});

/**
 * Schema for creating an order via API.
 */
export const createOrderSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    mealId: z.string().min(1, "Meal ID is required"),
    rotationId: z.string().min(1, "Rotation ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price cannot be negative"),
    totalAmount: z.number().min(0, "Total amount cannot be negative"),
    settlementMethod: settlementMethodSchema.optional(),
    currency: z.string().length(3).optional().default("cad"),
  orderIntentId: z.string().optional(),
  checkoutSessionId: z.string().optional(),
  orderGroupId: z.string().optional(),
  substitutions: z.array(orderSubstitutionSchema).optional(),
  modifiers: z.array(orderModifierSchema).optional(),
  notes: z.string().optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional(),
  pickupLocation: z.string().optional(),
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(1).optional(),
  customerDeliveryAddress: z.string().min(1).optional(),
  customerDeliveryCity: z.string().min(1).optional(),
  customerDeliveryPostal: z.string().min(1).optional(),
  customerDeliveryNotes: z.string().optional(),
  customerIsGuest: z.boolean().optional(),
  stripeSessionId: z.string().min(1, "Stripe session ID is required").optional(),
  stripePaymentIntentId: z
    .string()
    .min(1, "Stripe payment intent ID is required")
    .optional(),
  stripeChargeId: z.string().optional(),
  stripeBalanceTransactionId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const method = data.settlementMethod ?? "STRIPE";
    if (method === "STRIPE" && data.totalAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stripe orders must have a positive total",
        path: ["totalAmount"],
      });
    }
  });

export const fulfillmentStatusSchema = z.enum([
  "NEW",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

export const paymentStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

/**
 * Schema for updating fulfillment status.
 */
export const updateFulfillmentStatusSchema = z.object({
  fulfillmentStatus: fulfillmentStatusSchema,
  reason: z.string().max(5000).optional(),
  /** For internal API callers without a browser session (optional). */
  changedById: z.string().optional(),
});

/**
 * Schema for updating payment status.
 */
export const updatePaymentStatusSchema = z.object({
  paymentStatus: paymentStatusSchema,
});

// ============================================
// Type Exports
// ============================================

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateFulfillmentStatusInput = z.infer<
  typeof updateFulfillmentStatusSchema
>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type OrderSubstitution = z.infer<typeof orderSubstitutionSchema>;
export type OrderModifier = z.infer<typeof orderModifierSchema>;
