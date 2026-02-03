"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconChefHat,
  IconCoin,
  IconPackage,
  IconTruckDelivery,
  IconShoppingBag,
} from "@tabler/icons-react";
import type { OrderWithRelations } from "@/lib/types/order-types";

interface OrdersOverviewProps {
  orders: OrderWithRelations[];
}

export function OrdersOverview({ orders }: OrdersOverviewProps) {
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const totalMeals = paidOrders.reduce((sum, o) => sum + o.quantity, 0);
  const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const deliveries = paidOrders.filter((o) => o.deliveryMethod === "DELIVERY");
  const pickups = paidOrders.filter((o) => o.deliveryMethod === "PICKUP");
  const boosts = paidOrders.filter((o) => o.proteinBoost).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Paid Orders
            </p>
            <p className="text-2xl font-semibold">{paidOrders.length}</p>
            <p className="text-xs text-muted-foreground">
              {orders.length} total orders
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <IconShoppingBag className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Meals to Prep
            </p>
            <p className="text-2xl font-semibold">{totalMeals}</p>
            <p className="text-xs text-muted-foreground">
              {boosts} protein boosts
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <IconChefHat className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Revenue
            </p>
            <p className="text-2xl font-semibold">${revenue.toFixed(2)}</p>
            <Badge variant="secondary" className="mt-2 text-xs">
              Paid only
            </Badge>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <IconCoin className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Deliveries
            </p>
            <p className="text-2xl font-semibold">{deliveries.length}</p>
            <p className="text-xs text-muted-foreground">
              Door drop-offs
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <IconTruckDelivery className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pickups
            </p>
            <p className="text-2xl font-semibold">{pickups.length}</p>
            <p className="text-xs text-muted-foreground">
              Location handoff
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <IconPackage className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
