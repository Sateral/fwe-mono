import { z } from "zod";

// ============================================
// Order Schemas
// ============================================

/**
 * Schema for order substitution data.
 */
export const orderSubstitutionSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  optionName: z.string().min(1, "Option name is required"),
});

export const orderModifierSchema = z.object({
  groupName: z.string().min(1, "Group name is required"),
  optionNames: z.array(z.string()).min(1, "At least one option is required"),
});

/**
 * Schema for creating an order via API.
 */
export const createOrderSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  mealId: z.string().min(1, "Meal ID is required"),
  rotationId: z.string().min(1, "Rotation ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().positive("Unit price must be positive"),
  totalAmount: z.number().positive("Total amount must be positive"),
  currency: z.string().length(3).optional().default("cad"),
  substitutions: z.array(orderSubstitutionSchema).optional(),
  modifiers: z.array(orderModifierSchema).optional(),
  proteinBoost: z.boolean().default(false),
  notes: z.string().optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional(),
  pickupLocation: z.string().optional(),
  stripeSessionId: z.string().min(1, "Stripe session ID is required"),
  stripePaymentIntentId: z
    .string()
    .min(1, "Stripe payment intent ID is required"),
  stripeChargeId: z.string().optional(),
  stripeBalanceTransactionId: z.string().optional(),
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
