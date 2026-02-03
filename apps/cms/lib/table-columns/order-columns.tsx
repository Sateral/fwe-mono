/**
 * Order Table Column Definitions
 *
 * Extracted from orders-table.tsx for better organization.
 * Columns are created via factory function to support dynamic options.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconClock } from "@tabler/icons-react";
import { format } from "date-fns";
import {
  STATUS_CONFIG,
  ORDER_STATUS_FLOW,
  DEFAULT_PICKUP_LOCATION,
} from "@/lib/constants/order.constants";
import type { OrderWithRelations, OrderStatus } from "@/lib/types/order-types";

interface OrderColumnOptions {
  onQuickUpdate: (order: OrderWithRelations) => void;
  onViewOrder: (order: OrderWithRelations) => void;
  isPending: boolean;
  pendingOrderId?: string;
}

export function getOrderColumns(
  options: OrderColumnOptions,
): ColumnDef<OrderWithRelations>[] {
  const { onQuickUpdate, onViewOrder, isPending, pendingOrderId } = options;

  return [
    {
      accessorKey: "user.name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.user?.name || "Guest"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.user?.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "meal.name",
      header: "Meal",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="font-medium truncate">{row.original.meal?.name}</div>
          <div className="text-xs text-muted-foreground">
            Qty: {row.original.quantity}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "deliveryMethod",
      header: "Fulfillment",
      cell: ({ row }) => {
        const method = row.original.deliveryMethod;
        return (
          <Badge variant={method === "PICKUP" ? "secondary" : "outline"}>
            {method === "PICKUP"
              ? row.original.pickupLocation || DEFAULT_PICKUP_LOCATION
              : "Delivery"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status as OrderStatus;
        const config = STATUS_CONFIG[status];
        return (
          <Badge className={`${config.bgColor} border-0`} variant="outline">
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${config.dotColor}`}
            />
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium">
          ${row.original.totalAmount.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Ordered",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), "MMM d, h:mm a")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
        const statusAction = ORDER_STATUS_FLOW[order.status as OrderStatus];
        const isUpdating = isPending && pendingOrderId === order.id;

        return (
          <div className="flex items-center gap-2">
            {statusAction && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onQuickUpdate(order)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  "..."
                ) : statusAction.nextStatus === "PREPARING" ? (
                  <>
                    <IconClock className="w-4 h-4 mr-1" /> Start
                  </>
                ) : statusAction.nextStatus === "DELIVERED" ? (
                  <>
                    <IconCheck className="w-4 h-4 mr-1" /> Done
                  </>
                ) : null}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewOrder(order)}
            >
              View
            </Button>
          </div>
        );
      },
    },
  ];
}
