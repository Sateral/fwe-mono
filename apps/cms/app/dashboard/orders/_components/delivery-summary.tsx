"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconMapPin,
  IconPhone,
  IconTruckDelivery,
  IconPackage,
} from "@tabler/icons-react";
import { DEFAULT_PICKUP_LOCATION } from "@/lib/constants/order.constants";
import type { OrderWithRelations, OrderUser } from "@/lib/types/order-types";

interface DeliverySummaryProps {
  orders: OrderWithRelations[];
  onSelectOrders: (orders: OrderWithRelations[]) => void;
}

interface DeliveryGroup {
  key: string;
  label: string;
  address: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation?: string;
  orders: OrderWithRelations[];
  totalMeals: number;
}

export function DeliverySummary({ orders, onSelectOrders }: DeliverySummaryProps) {
  const paidOrders = orders.filter(
    (o) => o.paymentStatus === "PAID" && o.fulfillmentStatus !== "CANCELLED",
  );

  const deliveryGroups = paidOrders.reduce<DeliveryGroup[]>((acc, order) => {
    const user = order.user as OrderUser | null;
    const contactName = user?.name || "Guest";
    const contactEmail = user?.email || null;
    const contactPhone = user?.phone || null;

    if (order.deliveryMethod === "PICKUP") {
      const location = order.pickupLocation || DEFAULT_PICKUP_LOCATION;
      const key = `pickup:${location}`;
      const existing = acc.find((g) => g.key === key);
      if (existing) {
        existing.orders.push(order);
        existing.totalMeals += order.quantity;
        return acc;
      }

      acc.push({
        key,
        label: "Pickup",
        address: `Pickup at ${location}`,
        contactName,
        contactEmail,
        contactPhone,
        deliveryMethod: "PICKUP",
        pickupLocation: location,
        orders: [order],
        totalMeals: order.quantity,
      });
      return acc;
    }

    const address = [
      user?.deliveryAddress,
      user?.deliveryCity,
      user?.deliveryPostal,
    ]
      .filter(Boolean)
      .join(", ");

    const key = `delivery:${address || order.id}`;
    const existing = acc.find((g) => g.key === key);
    if (existing) {
      existing.orders.push(order);
      existing.totalMeals += order.quantity;
      return acc;
    }

    acc.push({
      key,
      label: "Delivery",
      address: address || "No address provided",
      contactName,
      contactEmail,
      contactPhone,
      deliveryMethod: "DELIVERY",
      orders: [order],
      totalMeals: order.quantity,
    });

    return acc;
  }, []);

  if (paidOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-sm text-muted-foreground text-center py-8">
            No paid orders to deliver yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">Stops</div>
          <Badge variant="secondary">{deliveryGroups.length}</Badge>
        </div>
        {deliveryGroups.map((group) => (
          <div
            key={group.key}
            className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {group.deliveryMethod === "DELIVERY" ? (
                  <IconTruckDelivery className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <IconPackage className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">
                  {group.contactName}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {group.totalMeals} meals
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-start gap-2">
              <IconMapPin className="h-4 w-4 mt-0.5" />
              <span>{group.address}</span>
            </div>
            {(group.contactEmail || group.contactPhone) && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <IconPhone className="h-3.5 w-3.5" />
                <span>
                  {group.contactEmail || "No email"}
                  {group.contactPhone ? ` • ${group.contactPhone}` : ""}
                </span>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectOrders(group.orders)}
              >
                View Orders
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
