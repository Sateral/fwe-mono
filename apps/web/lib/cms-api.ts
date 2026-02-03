import type {
  ApiDietaryTag,
  ApiFailedOrder,
  ApiMeal,
  ApiModifierGroup,
  ApiModifierOption,
  ApiOrder,
  ApiSubstitutionGroup,
  ApiSubstitutionOption,
  ApiUser,
  FailedOrderStatus,
  OrderStatus,
} from "@fwe/types";
import type {
  CreateFailedOrderInput,
  CreateOrderInput,
  UpdateProfileInput,
} from "@fwe/validators";

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
  options: RequestInit = {},
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

export type {
  ApiDietaryTag,
  ApiFailedOrder,
  ApiMeal,
  ApiModifierGroup,
  ApiModifierOption,
  ApiOrder,
  ApiSubstitutionGroup,
  ApiSubstitutionOption,
  ApiUser,
} from "@fwe/types";
export type {
  CreateFailedOrderInput,
  CreateOrderInput,
  UpdateProfileInput,
} from "@fwe/validators";

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
        `/api/orders/stripe-session/${sessionId}`,
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
  async updateStatus(id: string, status: OrderStatus): Promise<ApiOrder> {
    return apiRequest<ApiOrder>(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================
// Failed Orders API (Dead Letter Queue)
// ============================================

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
    status?: FailedOrderStatus,
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
    adminUserId?: string,
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
    adminUserId?: string,
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
