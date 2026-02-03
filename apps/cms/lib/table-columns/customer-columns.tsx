/**
 * Customer Summary Table Column Definitions
 *
 * Extracted from customer-summary-table.tsx for better organization.
 */

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconChevronRight,
  IconUser,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react";
import { DEFAULT_PICKUP_LOCATION } from "@/lib/constants/order.constants";
import type {
  FulfillmentStatus,
  OrderWithRelations,
} from "@/lib/types/order-types";

// ============================================
// Customer Summary Types
// ============================================

export interface CustomerSummary {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  deliveryNotes: string | null;
  deliveryMethodSummary: "DELIVERY" | "PICKUP" | "MIXED";
  pickupLocation: string | null;
  orderCount: number;
  totalSpend: number;
  status: FulfillmentStatus | "PARTIAL";
  orders: OrderWithRelations[];
}

// ============================================
// Column Definitions
// ============================================

interface CustomerColumnOptions {
  onSelectCustomer: (orders: OrderWithRelations[]) => void;
}

export function getCustomerColumns(
  options: CustomerColumnOptions,
): ColumnDef<CustomerSummary>[] {
  const { onSelectCustomer } = options;

  return [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-full">
            <IconUser className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.email}
            </div>
            {row.original.phone && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <IconPhone className="w-3 h-3" />
                {row.original.phone}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "deliveryAddress",
      header: "Delivery",
      cell: ({ row }) => {
        const {
          deliveryAddress,
          deliveryCity,
          deliveryPostal,
          deliveryNotes,
          deliveryMethodSummary,
          pickupLocation,
        } = row.original;

        if (deliveryMethodSummary === "PICKUP") {
          return (
            <div className="max-w-[200px] text-sm">
              <div className="flex items-start gap-1">
                <IconMapPin className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="truncate">
                    Pickup at {pickupLocation || DEFAULT_PICKUP_LOCATION}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    No delivery needed
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (!deliveryAddress) {
          return (
            <span className="text-muted-foreground text-sm">
              {deliveryMethodSummary === "MIXED"
                ? "Mixed (pickup + delivery)"
                : "No address"}
            </span>
          );
        }

        return (
          <div className="max-w-[200px]">
            <div className="flex items-start gap-1">
              <IconMapPin className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <div className="truncate">{deliveryAddress}</div>
                <div className="text-xs text-muted-foreground">
                  {[deliveryCity, deliveryPostal].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
            {deliveryNotes && (
              <div
                className="text-xs text-amber-600 mt-1 italic truncate"
                title={deliveryNotes}
              >
                Note: {deliveryNotes}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "orderCount",
      header: "Meals",
      cell: ({ row }) => (
        <span className="font-semibold text-lg">{row.original.orderCount}</span>
      ),
    },
    {
      accessorKey: "totalSpend",
      header: "Total",
      cell: ({ row }) => <span>${row.original.totalSpend.toFixed(2)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        let variant: "default" | "secondary" | "outline" | "destructive" =
          "outline";

        if (status === "DELIVERED") variant = "default";
        if (status === "CANCELLED") variant = "destructive";
        if (status === "PREPARING" || status === "READY") variant = "secondary";
        if (status === "PARTIAL") variant = "secondary";

        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectCustomer(row.original.orders)}
        >
          View <IconChevronRight className="ml-1 w-4 h-4" />
        </Button>
      ),
    },
  ];
}
