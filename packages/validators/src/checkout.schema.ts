import { z } from "zod";

export const settlementMethodSchema = z.enum([
  "STRIPE",
  "MEAL_PLAN_CREDITS",
]);

export const cartStatusSchema = z.enum([
  "ACTIVE",
  "CHECKED_OUT",
  "ABANDONED",
  "MERGED",
]);

export const substitutionItemSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
});

export const modifierItemSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionIds: z.array(z.string()),
  optionNames: z.array(z.string()),
});

export const checkoutRequestSchema = z.object({
  mealId: z.string().min(1, "Meal ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  substitutions: z.array(substitutionItemSchema).optional(),
  modifiers: z.array(modifierItemSchema).optional(),
  proteinBoost: z.boolean().default(false),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional().default("DELIVERY"),
  pickupLocation: z.string().optional(),
  notes: z.string().optional(),
  requestId: z.string().uuid().optional(),
});

export const checkoutSessionRequestSchema = checkoutRequestSchema.extend({
  userId: z.string().min(1, "User ID is required"),
  userEmail: z.string().email("Valid email required"),
  userName: z.string().optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutSessionRequest = z.infer<
  typeof checkoutSessionRequestSchema
>;
export type SettlementMethod = z.infer<typeof settlementMethodSchema>;
export type CartStatus = z.infer<typeof cartStatusSchema>;
