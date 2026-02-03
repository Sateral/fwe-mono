import { ModifierType, MealType } from "./generated/prisma/enums";

export interface CreateMealParams {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  mealType?: MealType;
  // Direct meal pricing & macros
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  tags: {
    id: string;
    name: string;
  }[];
  substitutionGroups: {
    name: string;
    options: {
      name: string;
      isDefault: boolean;
      priceAdjustment: number;
      calorieAdjust: number;
      proteinAdjust: number;
      carbsAdjust: number;
      fatAdjust: number;
      fiberAdjust: number;
    }[];
  }[];
  modifierGroups: {
    name: string;
    type: ModifierType;
    minSelection: number;
    maxSelection?: number | null;
    options: {
      name: string;
      extraPrice: number;
    }[];
  }[];
}

export interface CreateTagParams {
  name: string;
  color: string;
  icon: string;
}
