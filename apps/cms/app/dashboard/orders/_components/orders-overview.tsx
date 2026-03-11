"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconShoppingBag, IconTruckDelivery } from "@tabler/icons-react";
import type { OrderWithRelations } from "@/lib/types/order-types";

interface OrdersOverviewProps {
  orders: OrderWithRelations[];
}

export function OrdersOverview({ orders }: OrdersOverviewProps) {
  const paidOrders = orders.filter(
    (o) => o.paymentStatus === "PAID" && o.fulfillmentStatus !== "CANCELLED",
  );
  const totalMeals = paidOrders.reduce((sum, o) => sum + o.quantity, 0);
  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const deliveries = paidOrders.filter((o) => o.deliveryMethod === "DELIVERY");
  const pickups = paidOrders.filter((o) => o.deliveryMethod === "PICKUP");
  const boosts = paidOrders.reduce(
    (sum, order) => sum + (order.proteinBoost ? order.quantity : 0),
    0,
  );
  const uniqueCustomers = new Set(
    paidOrders.map((o) => o.userId || o.user?.email || "guest"),
  ).size;
  const averageOrder =
    paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  return (
    <Card className="h-full">
      <CardContent className="p-6 h-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Workload Snapshot
            </p>
            <p className="text-lg font-semibold text-foreground">
              Paid orders this rotation
            </p>
          </div>
          <Badge variant="outline">{orders.length} total orders</Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Paid Orders
            </p>
            <div className="mt-2 text-3xl font-semibold text-foreground">
              {paidOrders.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {uniqueCustomers} customers
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Meals to Prep
            </p>
            <div className="mt-2 text-3xl font-semibold text-foreground">
              {totalMeals}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {boosts} protein boosts
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Revenue
            </p>
            <div className="mt-2 text-3xl font-semibold text-foreground">
              ${revenue.toFixed(2)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Avg order ${averageOrder.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Fulfillment Mix
            </p>
            <div className="mt-2 flex items-center gap-4 text-foreground">
              <div className="flex items-center gap-2">
                <IconTruckDelivery className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">
                  {deliveries.length}
                </span>
                <span className="text-sm text-muted-foreground">deliveries</span>
              </div>
              <div className="flex items-center gap-2">
                <IconShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-semibold">
                  {pickups.length}
                </span>
                <span className="text-sm text-muted-foreground">pickups</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
