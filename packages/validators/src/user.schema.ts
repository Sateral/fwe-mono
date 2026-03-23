import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const flavorProfileInvolvementSchema = z.enum([
  "HANDS_ON",
  "HANDS_OFF",
]);

export const onboardingStatusSchema = z.enum([
  "PENDING",
  "SKIPPED",
  "COMPLETED",
]);

export const mealPlanSchema = z.object({
  remainingCredits: z.number().int().min(0),
  weeklyCreditCap: z.number().int().min(0),
});

export const flavorProfileSchema = z.object({
  goals: z.array(z.string()),
  restrictions: z.array(z.string()),
  preferences: z.array(z.string()),
  involvement: flavorProfileInvolvementSchema,
});

export const upsertFlavorProfileRequestSchema = flavorProfileSchema.extend({
  userId: z.string().min(1, "User ID is required"),
});

export const referralCodeSchema = z.object({
  code: z.string().trim().min(1, "Referral code is required"),
});

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
  flavorProfile: flavorProfileSchema.optional(),
  onboardingStatus: onboardingStatusSchema.optional(),
});

export const updateProfileRequestSchema = updateProfileSchema.extend({
  userId: z.string().min(1, "User ID is required"),
});

export type MealPlan = z.infer<typeof mealPlanSchema>;
export type FlavorProfile = z.infer<typeof flavorProfileSchema>;
export type FlavorProfileInput = z.infer<typeof flavorProfileSchema>;
export type FlavorProfileInvolvement = z.infer<
  typeof flavorProfileInvolvementSchema
>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type UpsertFlavorProfileRequest = z.infer<
  typeof upsertFlavorProfileRequestSchema
>;
export type ReferralCode = z.infer<typeof referralCodeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
