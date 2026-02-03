import type { CreateOrderInput } from "@fwe/validators";

export type ModifierType = "SINGLE_SELECT" | "MULTI_SELECT";
export type MealType = "SIGNATURE" | "ROTATING";
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "DELIVERED"
  | "CANCELLED";
export type DeliveryMethod = "DELIVERY" | "PICKUP";
export type FailedOrderStatus =
  | "PENDING"
  | "RETRYING"
  | "RESOLVED"
  | "ABANDONED";

export interface ApiMeal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  mealType: MealType;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  createdAt: string;
  updatedAt: string;
  substitutionGroups: ApiSubstitutionGroup[];
  modifierGroups: ApiModifierGroup[];
  tags: ApiDietaryTag[];
}

export interface ApiSubstitutionGroup {
  id: string;
  name: string;
  mealId: string;
  options: ApiSubstitutionOption[];
}

export interface ApiSubstitutionOption {
  id: string;
  name: string;
  isDefault: boolean;
  priceAdjustment: number;
  calorieAdjust: number;
  proteinAdjust: number;
  carbsAdjust: number;
  fatAdjust: number;
  fiberAdjust: number;
  groupId: string;
}

export interface ApiModifierGroup {
  id: string;
  name: string;
  type: ModifierType;
  minSelection: number;
  maxSelection: number | null;
  mealId: string;
  options: ApiModifierOption[];
}

export interface ApiModifierOption {
  id: string;
  name: string;
  extraPrice: number;
  modifierGroupId: string;
}

export interface ApiDietaryTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ApiOrder {
  id: string;
  userId: string;
  mealId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  substitutions: { groupName: string; optionName: string }[] | null;
  modifiers: { groupName: string; optionNames: string[] }[] | null;
  proteinBoost: boolean;
  notes: string | null;
  deliveryMethod: DeliveryMethod;
  pickupLocation: string | null;
  status: OrderStatus;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  meal: ApiMeal;
  rotationId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApiFailedOrder {
  id: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  orderData: CreateOrderInput;
  errorMessage: string;
  errorCode: string | null;
  status: FailedOrderStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  phone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  deliveryNotes: string | null;
  profileComplete: boolean;
}
