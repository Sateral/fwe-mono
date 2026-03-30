/**
 * Order Table Column Definitions
 *
 * Extracted from orders-table.tsx for better organization.
 * Columns are created via factory function to support dynamic options.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconClock, IconTruckDelivery } from "@tabler/icons-react";
import { format } from "date-fns";
import {
  STATUS_CONFIG,
  FULFILLMENT_STATUS_FLOW,
  PAYMENT_STATUS_CONFIG,
  DEFAULT_PICKUP_LOCATION,
} from "@/lib/constants/order.constants";
import type {
  FulfillmentStatus,
  OrderWithRelations,
  PaymentStatus,
} from "@/lib/types/order-types";

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
          <div className="font-medium text-foreground">
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
      cell: ({ row }) => {
        const substitutions = Array.isArray(row.original.substitutions)
          ? row.original.substitutions
          : [];
        const modifiers = Array.isArray(row.original.modifiers)
          ? row.original.modifiers
          : [];
        const hasNotes = Boolean(row.original.notes);
        const subsLabel = substitutions.length
          ? substitutions
              .map((sub) =>
                typeof sub === "object" && sub !== null && "optionName" in sub
                  ? String(sub.optionName)
                  : "",
              )
              .filter(Boolean)
              .slice(0, 2)
              .join(", ")
          : "";
        const modsLabel = modifiers.length
          ? modifiers
              .map((mod) =>
                typeof mod === "object" && mod !== null && "groupName" in mod
                  ? String(mod.groupName)
                  : "",
              )
              .filter(Boolean)
              .slice(0, 2)
              .join(", ")
          : "";
        const subsDisplay = substitutions.length
          ? subsLabel || `Subs x${substitutions.length}`
          : "";
        const modsDisplay = modifiers.length
          ? modsLabel || `Mods x${modifiers.length}`
          : "";

        return (
          <div className="max-w-[240px] space-y-1">
            <div className="font-medium truncate">{row.original.meal?.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                Qty {row.original.quantity}
              </span>
              {row.original.orderIntent?.clientRequestId?.startsWith("assignment:") && (
                  <span className="rounded-full border bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                    Chef assigned
                  </span>
                )}
              {subsDisplay && (
                <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                  {subsDisplay}
                </span>
              )}
              {modsDisplay && (
                <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                  {modsDisplay}
                </span>
              )}
              {hasNotes && (
                <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                  Notes
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "deliveryMethod",
      header: "Method",
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
      accessorKey: "fulfillmentStatus",
      header: "Status",
      cell: ({ row }) => {
        const status =
          row.original.fulfillmentStatus as FulfillmentStatus;
        const config = STATUS_CONFIG[status];
        return (
          <Badge className={`${config.bgColor} border-0`} variant="outline">
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${config.dotColor}`}
            />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.original.paymentStatus as PaymentStatus;
        const config = PAYMENT_STATUS_CONFIG[status];
        return (
          <Badge className={`${config.bgColor} border-0`} variant="outline">
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${config.dotColor}`}
            />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
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
        const statusAction =
          FULFILLMENT_STATUS_FLOW[
            order.fulfillmentStatus as FulfillmentStatus
          ];
        const isUpdating = isPending && pendingOrderId === order.id;
        const isPaymentReady = order.paymentStatus === "PAID";

        return (
          <div className="flex items-center gap-2">
            {statusAction && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onQuickUpdate(order)}
              disabled={isUpdating || !isPaymentReady}
            >
                {isUpdating ? (
                  "..."
                ) : statusAction.nextStatus === "PREPARING" ? (
                  <>
                    <IconClock className="w-4 h-4 mr-1" /> Start
                  </>
                ) : statusAction.nextStatus === "READY" ? (
                  <>
                    <IconCheck className="w-4 h-4 mr-1" /> Ready
                  </>
                ) : statusAction.nextStatus === "DELIVERED" ? (
                  <>
                    <IconTruckDelivery className="w-4 h-4 mr-1" /> Delivered
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
