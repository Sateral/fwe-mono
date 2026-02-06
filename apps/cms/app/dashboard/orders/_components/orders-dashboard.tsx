"use client";

import * as React from "react";
import { format, isWithinInterval, isFuture, subDays } from "date-fns";
import { OrdersTable } from "./orders-table";
import { CustomerSummaryTable } from "./customer-summary-table";
import { CustomerOrdersDialog } from "./customer-orders-dialog";
import { RotationSelector } from "./rotation-selector";
import { ProductionSummary } from "./production-summary";
import { OrdersOverview } from "./orders-overview";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTruck, IconClock, IconChefHat, IconLoader2 } from "@tabler/icons-react";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import {
  useRotations,
  useOrdersByRotation,
} from "@/hooks/use-orders";
import type { OrderWithRelations } from "@/lib/types/order-types";

export function OrdersDashboard() {
  // Get selected rotation from context
  const { selectedRotationId, setSelectedRotationId } = useSelectedRotation();

  // Fetch rotations
  const { data: rotations = [], isLoading: rotationsLoading } = useRotations();

  // Auto-select first rotation if none selected
  React.useEffect(() => {
    if (!selectedRotationId && rotations.length > 0) {
      const firstRotation = rotations[0];
      if (firstRotation) {
        setSelectedRotationId(firstRotation.id);
      }
    }
  }, [selectedRotationId, rotations, setSelectedRotationId]);

  // Fetch orders for selected rotation
  const { data: orders = [], isLoading: ordersLoading } =
    useOrdersByRotation(selectedRotationId);

  // Dialog state for customer orders
  const [selectedCustomerOrders, setSelectedCustomerOrders] = React.useState<
    OrderWithRelations[]
  >([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleCustomerSelect = (customerOrders: OrderWithRelations[]) => {
    setSelectedCustomerOrders(customerOrders);
    setSheetOpen(true);
  };

  const currentRotation = rotations.find((r) => r.id === selectedRotationId);
  const paidOrders = orders.filter(
    (order) =>
      order.paymentStatus === "PAID" && order.fulfillmentStatus !== "CANCELLED",
  );
  const uniqueCustomers = new Set(
    paidOrders.map((order) => order.userId || order.user?.email || "guest"),
  ).size;

  // Determine the context of the selected rotation
  const rotationContext = React.useMemo(() => {
    if (!currentRotation) return null;

    const now = new Date();
    const weekStart = new Date(currentRotation.weekStart);
    const weekEnd = new Date(currentRotation.weekEnd);

    const isCurrentDeliveryWeek = isWithinInterval(now, {
      start: weekStart,
      end: weekEnd,
    });
    const isUpcoming = isFuture(weekStart);

    if (isCurrentDeliveryWeek) {
      return {
        label: "Prep Mode",
        description: "These orders are for delivery THIS week. Time to prep!",
        variant: "default" as const,
        icon: IconChefHat,
      };
    }

    if (isUpcoming) {
      return {
        label: "Collecting Orders",
        description: "Orders are being collected for this delivery week.",
        variant: "secondary" as const,
        icon: IconClock,
      };
    }

    return {
      label: "Past Delivery",
      description: "This delivery week has passed.",
      variant: "outline" as const,
      icon: IconTruck,
    };
  }, [currentRotation]);

  const rotationWindow = React.useMemo(() => {
    if (!currentRotation) return null;
    const weekStart = new Date(currentRotation.weekStart);
    const weekEnd = new Date(currentRotation.weekEnd);
    const orderCutoff = currentRotation.orderCutoff
      ? new Date(currentRotation.orderCutoff)
      : subDays(weekStart, 1);
    const orderWindowStart = subDays(weekStart, 7);
    return { weekStart, weekEnd, orderCutoff, orderWindowStart };
  }, [currentRotation]);

  // Loading state
  if (rotationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Orders
            {rotationContext && (
              <Badge variant={rotationContext.variant}>
                {rotationContext.label}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Order Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentRotation
              ? `Delivery week: ${format(new Date(currentRotation.weekStart), "MMM d")} - ${format(new Date(currentRotation.weekEnd), "MMM d, yyyy")}`
              : "Select a delivery week to view orders"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RotationSelector />
          <Badge variant="outline">
            {ordersLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              `${paidOrders.length} paid orders / ${uniqueCustomers} customers`
            )}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
        <Badge variant="outline">
          {ordersLoading ? <Skeleton className="h-4 w-10" /> : `${orders.length} orders`}
        </Badge>
        <Badge variant="outline">
          {rotationWindow
            ? `Ordering ${format(rotationWindow.orderWindowStart, "MMM d")} - ${format(rotationWindow.orderCutoff, "MMM d")}`
            : "Ordering --"}
        </Badge>
        <Badge variant="outline">
          {rotationWindow
            ? `Cutoff ${format(rotationWindow.orderCutoff, "EEE, MMM d")}`
            : "Cutoff --"}
        </Badge>
        {rotationContext && (
          <Badge variant={rotationContext.variant}>{rotationContext.label}</Badge>
        )}
        {rotationContext && (
          <span className="text-muted-foreground">
            {rotationContext.description}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-6">
          <ProductionSummary />
        </div>
        <div className="lg:col-span-6">
          {!ordersLoading && <OrdersOverview orders={orders} />}
        </div>
      </div>

      <OrdersTable />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <IconTruck className="h-3.5 w-3.5" />
          Customer Fulfillment
        </div>
        <p className="text-sm text-muted-foreground">
          Delivery method, address, and meal breakdown per customer.
        </p>
        <CustomerSummaryTable onSelectCustomer={handleCustomerSelect} />
      </div>

      <CustomerOrdersDialog
        orders={selectedCustomerOrders}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
