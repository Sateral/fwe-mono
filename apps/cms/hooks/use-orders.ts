"use client";

/**
 * Order & Rotation Query Hooks
 *
 * TanStack Query hooks for unified data fetching.
 * All dashboard data flows through these hooks.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getOrdersByRotation,
  updateOrderStatus,
  getProductionSummary,
} from "@/lib/actions/order.actions";
import { getRotations } from "@/lib/actions/weekly-rotation.actions";
import {
  orderQueryKeys,
  rotationQueryKeys,
} from "@/lib/constants/order.constants";
import type {
  OrderWithRelations,
  OrderStatus,
  BulkUpdateResult,
  ProductionSummaryItem,
} from "@/lib/types/order-types";

// ============================================
// Rotation Hooks
// ============================================

/**
 * Fetch all rotations for the selector.
 */
export function useRotations() {
  return useQuery({
    queryKey: rotationQueryKeys.list(),
    queryFn: () => getRotations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// Order Query Hooks
// ============================================

/**
 * Fetch orders for a specific rotation.
 */
export function useOrdersByRotation(rotationId: string | null | undefined) {
  return useQuery({
    queryKey: orderQueryKeys.byRotation(rotationId ?? ""),
    queryFn: () => (rotationId ? getOrdersByRotation(rotationId) : []),
    enabled: !!rotationId,
  });
}

/**
 * Fetch production summary derived from orders.
 */
export function useProductionSummary(rotationId: string | null | undefined) {
  const { data: orders = [] } = useOrdersByRotation(rotationId);

  return useQuery({
    queryKey: orderQueryKeys.productionSummary(rotationId ?? ""),
    queryFn: () => getProductionSummary(orders),
    enabled: orders.length > 0,
  });
}

// ============================================
// Order Mutation Hooks
// ============================================

/**
 * Update a single order's status.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      return updateOrderStatus(orderId, status);
    },
    onSuccess: (_, variables) => {
      toast.success(`Order marked as ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
    onError: () => {
      toast.error("Failed to update order status");
    },
  });
}

/**
 * Update multiple orders' status in bulk.
 */
export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderIds,
      status,
    }: {
      orderIds: string[];
      status: OrderStatus;
    }): Promise<BulkUpdateResult> => {
      const results = await Promise.allSettled(
        orderIds.map((id) => updateOrderStatus(id, status)),
      );

      const succeeded: OrderWithRelations[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          succeeded.push(result.value as OrderWithRelations);
        } else {
          const orderId = orderIds[index] ?? "unknown";
          failed.push({
            id: orderId,
            error: result.reason?.message ?? "Unknown error",
          });
        }
      });

      return { succeeded, failed };
    },
    onSuccess: (result, variables) => {
      const { succeeded, failed } = result;

      if (failed.length === 0) {
        toast.success(
          `Marked ${succeeded.length} order${succeeded.length === 1 ? "" : "s"} as ${variables.status.toLowerCase()}`,
        );
      } else if (succeeded.length === 0) {
        toast.error(`Failed to update all ${failed.length} orders`);
      } else {
        toast.warning(
          `Updated ${succeeded.length} orders, ${failed.length} failed`,
        );
      }

      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
    },
    onError: () => {
      toast.error("Failed to update orders");
    },
  });
}
