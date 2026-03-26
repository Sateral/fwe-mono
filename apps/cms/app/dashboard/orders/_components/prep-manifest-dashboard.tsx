"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { IconArrowLeft, IconClipboardList, IconPrinter } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotationSelector } from "./rotation-selector";
import { ProductionSummary } from "./production-summary";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useOrdersByRotation, useRotations } from "@/hooks/use-orders";

export function PrepManifestDashboard() {
  const { selectedRotationId } = useSelectedRotation();
  const { data: rotations = [] } = useRotations();
  const { data: orders = [], isLoading: ordersLoading } =
    useOrdersByRotation(selectedRotationId);

  const currentRotation = rotations.find((r) => r.id === selectedRotationId);
  const paidOrders = orders.filter(
    (order) =>
      order.paymentStatus === "PAID" && order.fulfillmentStatus !== "CANCELLED",
  );

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-2">
          <Link
            href={
              selectedRotationId
                ? `/dashboard/orders?rotationId=${selectedRotationId}`
                : "/dashboard/orders"
            }
            className="print-hide inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            <IconClipboardList className="h-3.5 w-3.5" />
            Prep manifest
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Preparation planning
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentRotation
              ? `Delivery week: ${format(new Date(currentRotation.weekStart), "MMM d")} - ${format(new Date(currentRotation.weekEnd), "MMM d, yyyy")}`
              : "Select a delivery week to view prep details"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print-hide">
          <RotationSelector />
          <Badge variant="outline">
            {ordersLoading ? "Loading..." : `${paidOrders.length} paid orders`}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <IconPrinter className="mr-1.5 h-4 w-4" />
            Print prep
          </Button>
        </div>
      </div>

      <ProductionSummary variant="full" />
    </div>
  );
}
