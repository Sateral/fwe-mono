/**
 * Order Types
 *
 * Centralized type definitions for the orders dashboard.
 * These types ensure type safety across all order-related components.
 */

import type { orderService } from "@/lib/services/order.service";
import type { weeklyRotationService } from "@/lib/services/weekly-rotation.service";
import type { FulfillmentStatus, PaymentStatus } from "@fwe/validators";

// ============================================
// Order Types (derived from Prisma return types)
// ============================================

/**
 * Order with user and meal relations for dashboard use.
 * Derived from getOrdersByRotationId which is the primary data source.
 */
export type OrderWithRelations = Awaited<
  ReturnType<typeof orderService.getOrdersByRotationId>
>[0];

/**
 * Alias for backwards compatibility.
 */
export type OrderWithFullUser = OrderWithRelations;

// ============================================
// User Types
// ============================================

/**
 * User with delivery information as returned in orders.
 */
export interface OrderUser {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryPostal?: string | null;
  deliveryNotes?: string | null;
}

// ============================================
// Order Customization Types
// ============================================

/**
 * Substitution choice made by customer for an order.
 */
export interface OrderSubstitution {
  groupName: string;
  optionName: string;
}

/**
 * Modifier choice made by customer for an order.
 * Flat: one row per selected modifier option.
 */
export interface OrderModifier {
  groupName: string;
  optionName: string;
}

// ============================================
// Status Types (re-exported from @fwe/validators)
// ============================================

export type { FulfillmentStatus, PaymentStatus };

// ============================================
// Rotation Types
// ============================================

/**
 * Weekly rotation as returned from getAllRotations.
 */
export type Rotation = Awaited<
  ReturnType<typeof weeklyRotationService.getAllRotations>
>[0];

// ============================================
// Production Summary Types
// ============================================

/**
 * Production summary item for meal prep counts.
 */
export interface ProductionSummaryItem {
  mealId: string;
  mealName: string;
  count: number;
}

// ============================================
// Filter Types
// ============================================

/**
 * Filter parameters for order queries.
 */
export interface OrderFilters {
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  rotationId?: string;
}

// ============================================
// Bulk Update Types
// ============================================

/**
 * Result of a bulk order status update.
 */
export interface BulkUpdateResult {
  succeeded: OrderWithRelations[];
  failed: Array<{ id: string; error: string }>;
}
