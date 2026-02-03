"use client";

import * as React from "react";
import { format, isWithinInterval, isFuture } from "date-fns";
import { OrdersTable } from "./orders-table";
import { CustomerSummaryTable } from "./customer-summary-table";
import { CustomerOrdersDialog } from "./customer-orders-dialog";
import { RotationSelector } from "./rotation-selector";
import { ProductionSummary } from "./production-summary";
import { OrdersOverview } from "./orders-overview";
import { DeliverySummary } from "./delivery-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconTruck,
  IconClock,
  IconChefHat,
  IconLoader2,
} from "@tabler/icons-react";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import {
  useRotations,
  useOrdersByRotation,
  useProductionSummary,
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

  // Fetch production summary
  const { data: productionSummary = [] } =
    useProductionSummary(selectedRotationId);

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

  // Loading state
  if (rotationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Order Management
          </h1>
          <p className="text-muted-foreground">
            {currentRotation
              ? `Delivery week: ${format(new Date(currentRotation.weekStart), "MMM d")} - ${format(new Date(currentRotation.weekEnd), "MMM d, yyyy")}`
              : "Select a delivery week to view orders"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <RotationSelector />
        </div>
      </div>

      {/* Context Banner */}
      {rotationContext && (
        <Card
          className={`border-l-4 ${
            rotationContext.variant === "default"
              ? "border-l-green-500 bg-green-50/50"
              : rotationContext.variant === "secondary"
                ? "border-l-blue-500 bg-blue-50/50"
                : "border-l-gray-300"
          }`}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <rotationContext.icon
                className={`w-5 h-5 ${
                  rotationContext.variant === "default"
                    ? "text-green-600"
                    : rotationContext.variant === "secondary"
                      ? "text-blue-600"
                      : "text-gray-500"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{rotationContext.label}</span>
                  <Badge variant={rotationContext.variant}>
                    {ordersLoading ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      `${orders.length} orders`
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rotationContext.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!ordersLoading && orders.length > 0 && (
        <OrdersOverview orders={orders} />
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProductionSummary />
        </div>

        <div className="md:col-span-2 space-y-4">
          <OrdersTable />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Delivery & Pickup Manifest
          </h2>
          <p className="text-muted-foreground text-sm">
            Grouped stops with quick access to packing lists
          </p>
        </div>
        <DeliverySummary
          orders={orders}
          onSelectOrders={handleCustomerSelect}
        />
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Customer Fulfillment
          </h2>
          <p className="text-muted-foreground text-sm">
            Overview of order status by customer
          </p>
        </div>
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
