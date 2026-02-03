/**
 * Order Constants
 *
 * Centralized constants for the orders dashboard.
 * Extract hardcoded values here for maintainability.
 */

import type { OrderStatus } from "@/lib/types/order-types";

// ============================================
// Pickup Locations
// ============================================

export const DEFAULT_PICKUP_LOCATION = "Xtreme Couture";

// ============================================
// Status Configuration
// ============================================

/**
 * Unified status configuration for all UI components.
 * Single source of truth for status-related styling.
 */
export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    bgColor: string;
    dotColor: string;
    borderColor: string;
    badgeClass: string;
  }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    bgColor: "bg-gray-100",
    dotColor: "bg-gray-500",
    borderColor: "border-l-gray-400",
    badgeClass:
      "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  },
  PAID: {
    label: "Paid",
    variant: "default",
    bgColor: "bg-blue-100",
    dotColor: "bg-blue-500",
    borderColor: "border-l-blue-500",
    badgeClass: "bg-blue-500 hover:bg-blue-500",
  },
  PREPARING: {
    label: "Preparing",
    variant: "default",
    bgColor: "bg-amber-100",
    dotColor: "bg-orange-500",
    borderColor: "border-l-amber-500",
    badgeClass: "bg-orange-500 hover:bg-orange-500",
  },
  DELIVERED: {
    label: "Delivered",
    variant: "default",
    bgColor: "bg-green-100",
    dotColor: "bg-green-500",
    borderColor: "border-l-green-500",
    badgeClass: "bg-green-500 hover:bg-green-500",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "destructive",
    bgColor: "bg-red-100",
    dotColor: "bg-red-500",
    borderColor: "border-l-red-500",
    badgeClass: "",
  },
};

// Legacy exports for backwards compatibility (deprecated)
export const STATUS_BORDER_COLORS: Record<OrderStatus, string> =
  Object.fromEntries(
    Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.borderColor]),
  ) as Record<OrderStatus, string>;

export const STATUS_BG_COLORS: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.bgColor]),
) as Record<OrderStatus, string>;

export const STATUS_DOT_COLORS: Record<OrderStatus, string> =
  Object.fromEntries(
    Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.dotColor]),
  ) as Record<OrderStatus, string>;

// ============================================
// Status Flow
// ============================================

/**
 * Defines the next action for each status in the order workflow.
 * Returns null if no next action is available.
 */
export const ORDER_STATUS_FLOW: Record<
  OrderStatus,
  { label: string; nextStatus: OrderStatus } | null
> = {
  PENDING: null, // Orders should be paid first
  PAID: { label: "Start", nextStatus: "PREPARING" },
  PREPARING: { label: "Deliver", nextStatus: "DELIVERED" },
  DELIVERED: null, // Terminal state
  CANCELLED: null, // Terminal state
};

/**
 * Get the next status action for a given current status.
 */
export function getNextStatusAction(
  status: OrderStatus,
): { label: string; nextStatus: OrderStatus } | null {
  return ORDER_STATUS_FLOW[status];
}

// ============================================
// Query Keys
// ============================================

/**
 * TanStack Query keys for order-related queries.
 * Centralized for easy invalidation.
 */
export const orderQueryKeys = {
  all: ["orders"] as const,
  lists: () => [...orderQueryKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...orderQueryKeys.lists(), filters] as const,
  byRotation: (rotationId: string) =>
    [...orderQueryKeys.all, "rotation", rotationId] as const,
  details: () => [...orderQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...orderQueryKeys.details(), id] as const,
  stats: () => [...orderQueryKeys.all, "stats"] as const,
  productionSummary: (rotationId: string) =>
    [...orderQueryKeys.all, "production", rotationId] as const,
};

export const rotationQueryKeys = {
  all: ["rotations"] as const,
  list: () => [...rotationQueryKeys.all, "list"] as const,
  detail: (id: string) => [...rotationQueryKeys.all, "detail", id] as const,
};
