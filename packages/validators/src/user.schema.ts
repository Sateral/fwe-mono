import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  phone: z.preprocess(
    emptyToNull,
    z.string().min(10, "Valid phone number required").nullable().optional(),
  ),
  deliveryAddress: z.preprocess(
    emptyToNull,
    z.string().min(5, "Address is required").nullable().optional(),
  ),
  deliveryCity: z.preprocess(
    emptyToNull,
    z.string().min(2, "City is required").nullable().optional(),
  ),
  deliveryPostal: z.preprocess(
    emptyToNull,
    z.string().min(3, "Postal code is required").nullable().optional(),
  ),
  deliveryNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export const updateProfileRequestSchema = updateProfileSchema.extend({
  userId: z.string().min(1, "User ID is required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
