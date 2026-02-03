import { fetchWithTimeout } from "@/lib/http-client";

/**
 * CMS API Client
 *
 * This module provides type-safe functions to communicate with the CMS API.
 * All database operations go through these endpoints - the commerce app
 * does not have direct database access.
 *
 * Security: All requests include an internal API key for authentication.
 */

// ============================================
// Configuration
// ============================================

const CMS_URL = process.env.CMS_API_URL || "http://localhost:3001";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Helper to make API requests with consistent error handling.
 * Includes internal API key for authentication.
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CMS_URL}${endpoint}`;
  console.log(`[CMS API] ${options.method || "GET"} ${endpoint}`);

  if (!INTERNAL_API_SECRET) {
    console.error("[CMS API] INTERNAL_API_SECRET not configured!");
    throw new Error("Internal API configuration error");
  }

  const response = await fetchWithTimeout(url, {
    ...options,
    timeoutMs: 8000,
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": INTERNAL_API_SECRET,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    console.error(`[CMS API] Error:`, error);
    throw new Error(error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Type Definitions
// ============================================

export interface ApiMeal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
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
  type: "SINGLE_SELECT" | "MULTI_SELECT";
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
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation: string | null;
  status: "PENDING" | "PAID" | "PREPARING" | "DELIVERED" | "CANCELLED";
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

export interface CreateOrderInput {
  userId: string;
  mealId: string;
  rotationId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  substitutions?: { groupName: string; optionName: string }[];
  modifiers?: { groupName: string; optionNames: string[] }[];
  proteinBoost?: boolean;
  notes?: string;
  deliveryMethod?: "DELIVERY" | "PICKUP";
  pickupLocation?: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
}

// ============================================
// Meals API
// ============================================

export const mealsApi = {
  /**
   * Get all meals.
   */
  async getAll(): Promise<ApiMeal[]> {
    return apiRequest<ApiMeal[]>("/api/meals");
  },

  /**
   * Get a meal by ID.
   */
  async getById(id: string): Promise<ApiMeal | null> {
    try {
      return await apiRequest<ApiMeal>(`/api/meals/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * Get a meal by slug.
   */
  async getBySlug(slug: string): Promise<ApiMeal | null> {
    try {
      return await apiRequest<ApiMeal>(`/api/meals/slug/${slug}`);
    } catch {
      return null;
    }
  },

  /**
   * Get featured meals for homepage.
   */
  async getFeatured(): Promise<ApiMeal[]> {
    return apiRequest<ApiMeal[]>("/api/meals?featured=true");
  },

  /**
   * Get meals by dietary tag.
   */
  async getByTag(tag: string): Promise<ApiMeal[]> {
    return apiRequest<ApiMeal[]>(`/api/meals?tag=${encodeURIComponent(tag)}`);
  },

  /**
   * Get available meals for ordering.
   * Returns signature meals + orderable rotation meals.
   * Week runs Sat-Fri. Orders placed now are delivered next week.
   */
  async getAvailable(): Promise<{
    meals: ApiMeal[];
    signatureMeals?: ApiMeal[];
    rotationMeals?: ApiMeal[];
    isOrderingOpen: boolean;
    currentWeekDisplay?: string;
    deliveryWeekDisplay?: string;
    deliveryWeekStart?: string;
    cutoffTime?: string;
  }> {
    return apiRequest("/api/rotation?available=true");
  },

  async getActiveRotation(): Promise<{
    id: string;
    weekStart: string;
    weekEnd: string;
    orderCutoff: string;
    deliveryWeekDisplay: string;
    cutoffDisplay: string;
  } | null> {
    try {
      return await apiRequest<{
        id: string;
        weekStart: string;
        weekEnd: string;
        orderCutoff: string;
        deliveryWeekDisplay: string;
        cutoffDisplay: string;
      } | null>("/api/rotation/active");
    } catch {
      return null;
    }
  },
};

// ============================================
// Orders API
// ============================================

export const ordersApi = {
  /**
   * Create a new order after successful payment.
   */
  async create(data: CreateOrderInput): Promise<ApiOrder> {
    return apiRequest<ApiOrder>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get an order by ID.
   */
  async getById(id: string): Promise<ApiOrder | null> {
    try {
      return await apiRequest<ApiOrder>(`/api/orders/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * Get an order by Stripe session ID.
   */
  async getByStripeSession(sessionId: string): Promise<ApiOrder | null> {
    try {
      return await apiRequest<ApiOrder>(
        `/api/orders/stripe-session/${sessionId}`
      );
    } catch {
      return null;
    }
  },

  /**
   * Get all orders for a user.
   */
  async getUserOrders(userId: string): Promise<ApiOrder[]> {
    return apiRequest<ApiOrder[]>(`/api/orders?userId=${userId}`);
  },

  /**
   * Update order status.
   */
  async updateStatus(
    id: string,
    status: "PENDING" | "PAID" | "PREPARING" | "DELIVERED" | "CANCELLED"
  ): Promise<ApiOrder> {
    return apiRequest<ApiOrder>(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================
// Failed Orders API (Dead Letter Queue)
// ============================================

export interface CreateFailedOrderInput {
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  customerEmail?: string;
  customerName?: string;
  orderData: CreateOrderInput;
  errorMessage: string;
  errorCode?: string;
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
  status: "PENDING" | "RETRYING" | "RESOLVED" | "ABANDONED";
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export const failedOrdersApi = {
  /**
   * Record a failed order for later recovery.
   */
  async create(data: CreateFailedOrderInput): Promise<ApiFailedOrder> {
    return apiRequest<ApiFailedOrder>("/api/failed-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all failed orders with optional status filter.
   */
  async getAll(
    status?: "PENDING" | "RETRYING" | "RESOLVED" | "ABANDONED"
  ): Promise<{ failedOrders: ApiFailedOrder[]; pendingCount: number }> {
    const query = status ? `?status=${status}` : "";
    return apiRequest(`/api/failed-orders${query}`);
  },

  /**
   * Get a single failed order by ID.
   */
  async getById(id: string): Promise<ApiFailedOrder | null> {
    try {
      return await apiRequest<ApiFailedOrder>(`/api/failed-orders/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * Retry a failed order.
   */
  async retry(
    id: string,
    adminUserId?: string
  ): Promise<{ success: boolean; order?: ApiOrder }> {
    return apiRequest(`/api/failed-orders/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "retry", adminUserId }),
    });
  },

  /**
   * Abandon a failed order (e.g., after refund).
   */
  async abandon(
    id: string,
    adminUserId?: string
  ): Promise<{ success: boolean }> {
    return apiRequest(`/api/failed-orders/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "abandon", adminUserId }),
    });
  },
};

// ============================================
// Users API
// ============================================

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

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryPostal?: string | null;
  deliveryNotes?: string | null;
}

export const usersApi = {
  /**
   * Get a user by ID.
   */
  async getById(id: string): Promise<ApiUser | null> {
    try {
      return await apiRequest<ApiUser>(`/api/users/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * Update user profile.
   */
  async updateProfile(id: string, data: UpdateProfileInput): Promise<ApiUser> {
    return apiRequest<ApiUser>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Unified API Export
// ============================================

export const cmsApi = {
  meals: mealsApi,
  orders: ordersApi,
  failedOrders: failedOrdersApi,
  users: usersApi,
};

export default cmsApi;
