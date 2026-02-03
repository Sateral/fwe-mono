import { z } from "zod";

import { createOrderSchema } from "./order.schema";

export const createFailedOrderSchema = z.object({
  stripeSessionId: z.string().min(1),
  stripePaymentIntentId: z.string().optional(),
  customerEmail: z.string().optional(),
  customerName: z.string().optional(),
  orderData: createOrderSchema,
  errorMessage: z.string(),
  errorCode: z.string().optional(),
});

export type CreateFailedOrderInput = z.infer<typeof createFailedOrderSchema>;
