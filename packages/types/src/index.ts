import type {
  CartStatus,
  CreateOrderInput,
  FlavorProfile,
  FlavorProfileInvolvement,
  MealPlan,
  SettlementMethod,
} from "@fwe/validators";

export type ModifierType = "SINGLE_SELECT" | "MULTI_SELECT";
export type MealType = "SIGNATURE" | "ROTATING";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type FulfillmentStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";
export type DeliveryMethod = "DELIVERY" | "PICKUP";
export type FailedOrderStatus =
  | "PENDING"
  | "RETRYING"
  | "RESOLVED"
  | "ABANDONED";
export type ApiFlavorProfileInvolvement = FlavorProfileInvolvement;

export type { CartStatus, SettlementMethod };

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
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundAmount: number;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId?: string | null;
  stripeRefundId?: string | null;
  stripeBalanceTransactionId?: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerDeliveryAddress: string | null;
  customerDeliveryCity: string | null;
  customerDeliveryPostal: string | null;
  customerDeliveryNotes: string | null;
  customerIsGuest: boolean;
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

export interface ApiOrderSession {
  sessionId: string;
  orders: ApiOrder[];
}

export interface ApiCart {
  id: string;
  settlementMethod: SettlementMethod;
  status: CartStatus;
  userId: string;
  rotationId: string | null;
  items: ApiCartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiCartItem {
  id: string;
  mealId: string;
  rotationId: string | null;
  quantity: number;
  unitPrice: number;
  substitutions: { groupName: string; optionName: string }[] | null;
  modifiers: { groupName: string; optionNames: string[] }[] | null;
  proteinBoost: boolean;
  notes: string | null;
  meal: Pick<ApiMeal, "id" | "name" | "slug" | "imageUrl">;
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

export type ApiMealPlan = MealPlan;

export type ApiFlavorProfile = FlavorProfile;

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
  guestMergeRequiresReview?: boolean;
  mealPlan?: ApiMealPlan | null;
  flavorProfile?: ApiFlavorProfile | null;
  referralCode?: string | null;
}
