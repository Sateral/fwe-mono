import { z } from "zod";

const substitutionOptionInputSchema = z.object({
  name: z.string().min(1, "Option name is required"),
  isDefault: z.boolean().default(false),
  priceAdjustment: z.coerce.number().default(0),
  calorieAdjust: z.coerce.number().default(0),
  proteinAdjust: z.coerce.number().default(0),
  carbsAdjust: z.coerce.number().default(0),
  fatAdjust: z.coerce.number().default(0),
  fiberAdjust: z.coerce.number().default(0),
});

const substitutionGroupInputSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  options: z
    .array(substitutionOptionInputSchema)
    .min(1, "At least one option is required"),
});

/** Exactly one default per group (DB partial unique index); first marked default wins, else index 0. */
function normalizeSubstitutionGroups<
  T extends { options: Array<{ isDefault: boolean }> },
>(groups: T[]): T[] {
  return groups.map((group) => {
    const marked = group.options.findIndex((o) => o.isDefault);
    const pick = marked >= 0 ? marked : 0;
    return {
      ...group,
      options: group.options.map((o, i) => ({
        ...o,
        isDefault: i === pick,
      })),
    } as T;
  });
}

export const mealSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? ""),
  imageUrl: z.string().nullable().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  // Direct meal pricing & macros
  price: z.coerce.number().min(0, "Price must be positive"),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  fiber: z.coerce.number().min(0),
  substitutionGroups: z.array(substitutionGroupInputSchema).default([]),
  modifierGroups: z
    .array(
      z.object({
        name: z.string().min(1, "Group name is required"),
        type: z.enum(["SINGLE_SELECT", "MULTI_SELECT"]),
        minSelection: z.coerce.number().min(0),
        maxSelection: z.coerce.number().nullable().optional(),
        options: z
          .array(
            z.object({
              name: z.string().min(1, "Option name is required"),
              extraPrice: z.coerce.number().min(0),
            }),
          )
          .min(1, "At least one option is required"),
      }),
    )
    .default([]),
  tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .default([]),
})
  .transform((data) => ({
    ...data,
    substitutionGroups: normalizeSubstitutionGroups(data.substitutionGroups),
  }))
  .superRefine((data, ctx) => {
    data.modifierGroups.forEach((group, gi) => {
      if (group.maxSelection != null) {
        if (group.maxSelection < group.minSelection) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "maxSelection must be >= minSelection",
            path: ["modifierGroups", gi, "maxSelection"],
          });
        }
        if (group.maxSelection < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "maxSelection must be at least 1 when set",
            path: ["modifierGroups", gi, "maxSelection"],
          });
        }
      }
    });
  });

export const tagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
});

export type MealFormValues = z.infer<typeof mealSchema>;
export type MealFormInput = z.input<typeof mealSchema>;

export type TagFormValues = z.infer<typeof tagSchema>;
export type TagFormInput = z.input<typeof tagSchema>;
