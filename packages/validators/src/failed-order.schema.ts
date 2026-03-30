import { z } from "zod";

import { createOrderSchema } from "./order.schema";

/** One or more order payloads for recovery (multi-line Stripe checkout). */
export const failedOrderOrderDataSchema = z.object({
  orders: z.array(createOrderSchema),
});

export const createFailedOrderSchema = z.object({
  stripeSessionId: z.string().min(1),
  stripePaymentIntentId: z.string().optional(),
  customerEmail: z.string().optional(),
  customerName: z.string().optional(),
  orderData: failedOrderOrderDataSchema,
  errorMessage: z.string(),
  errorCode: z.string().optional(),
});

export type CreateFailedOrderInput = z.infer<typeof createFailedOrderSchema>;
