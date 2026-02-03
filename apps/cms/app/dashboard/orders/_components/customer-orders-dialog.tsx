"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { useBulkUpdateOrderStatus } from "@/hooks/use-orders";
import {
  DEFAULT_PICKUP_LOCATION,
  STATUS_BORDER_COLORS,
} from "@/lib/constants/order.constants";
import type {
  OrderWithRelations,
  OrderStatus,
  OrderUser,
  OrderSubstitution,
  OrderModifier,
} from "@/lib/types/order-types";
import {
  IconTruckDelivery,
  IconMapPin,
  IconPhone,
  IconMail,
  IconClipboardList,
  IconFlame,
  IconNote,
} from "@tabler/icons-react";

interface CustomerOrdersDialogProps {
  orders: OrderWithRelations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerOrdersDialog({
  orders,
  open,
  onOpenChange,
}: CustomerOrdersDialogProps) {
  const bulkUpdateMutation = useBulkUpdateOrderStatus();

  // Memoized totals - must be before any early returns
  const { totalMeals, totalAmount } = React.useMemo(
    () => ({
      totalMeals: orders.reduce((sum, o) => sum + o.quantity, 0),
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    }),
    [orders],
  );

  if (!orders.length) return null;

  const customer = orders[0].user as OrderUser | null;
  const customerName = customer?.name || "Guest";
  const customerEmail = customer?.email || "";
  const customerPhone = customer?.phone || null;
  const deliveryAddress = customer?.deliveryAddress || null;
  const deliveryCity = customer?.deliveryCity || null;
  const deliveryPostal = customer?.deliveryPostal || null;
  const deliveryNotes = customer?.deliveryNotes || null;
  const pickupOrders = orders.filter((o) => o.deliveryMethod === "PICKUP");
  const deliveryOrders = orders.filter((o) => o.deliveryMethod !== "PICKUP");
  const pickupLocation =
    pickupOrders[0]?.pickupLocation || DEFAULT_PICKUP_LOCATION;

  const handleMarkAllDelivered = () => {
    const orderIds = orders
      .filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED")
      .map((o) => o.id);

    if (orderIds.length === 0) return;

    bulkUpdateMutation.mutate(
      { orderIds, status: "DELIVERED" },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleMarkAllPreparing = () => {
    const orderIds = orders.filter((o) => o.status === "PAID").map((o) => o.id);

    if (orderIds.length === 0) return;

    bulkUpdateMutation.mutate({ orderIds, status: "PREPARING" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconClipboardList className="w-5 h-5" />
            Packing List - {customerName}
          </DialogTitle>
          <DialogDescription>
            {totalMeals} meals • ${totalAmount.toFixed(2)} total
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Order Items Section */}
          <section className="space-y-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Order Items & Customizations
              </h3>
              <span className="text-xs text-muted-foreground">
                {orders.length} orders
              </span>
            </div>

            <div className="space-y-6">
              {orders.map((order) => {
                const substitutions =
                  (order.substitutions as unknown as OrderSubstitution[]) || [];
                const modifiers =
                  (order.modifiers as unknown as OrderModifier[]) || [];
                const borderClass =
                  STATUS_BORDER_COLORS[order.status as OrderStatus] ||
                  "border-l-muted";

                return (
                  <OrderItemCard
                    key={order.id}
                    order={order}
                    substitutions={substitutions}
                    modifiers={modifiers}
                    borderClass={borderClass}
                    customerEmail={customerEmail}
                    customerPhone={customerPhone}
                  />
                );
              })}
            </div>
          </section>

          {/* Logistics Sidebar */}
          <LogisticsSidebar
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            deliveryAddress={deliveryAddress}
            deliveryCity={deliveryCity}
            deliveryPostal={deliveryPostal}
            deliveryNotes={deliveryNotes}
            pickupOrders={pickupOrders}
            orders={orders}
            pickupLocation={pickupLocation}
            isUpdating={bulkUpdateMutation.isPending}
            onMarkAllPreparing={handleMarkAllPreparing}
            onMarkAllDelivered={handleMarkAllDelivered}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Sub-components
// ============================================

interface OrderItemCardProps {
  order: OrderWithRelations;
  substitutions: OrderSubstitution[];
  modifiers: OrderModifier[];
  borderClass: string;
  customerEmail: string;
  customerPhone: string | null;
}

function OrderItemCard({
  order,
  substitutions,
  modifiers,
  borderClass,
  customerEmail,
  customerPhone,
}: OrderItemCardProps) {
  return (
    <div
      className={`border border-l-4 ${borderClass} rounded-lg p-5 space-y-4`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold break-words">{order.meal?.name}</h4>
          <div className="text-xs text-muted-foreground mt-1">
            Qty {order.quantity} • ${order.unitPrice.toFixed(2)} each
          </div>
        </div>
        <div className="text-right shrink-0">
          <StatusBadge status={order.status as OrderStatus} />
          <div className="mt-1 font-semibold">
            ${order.totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {(order.proteinBoost ||
        order.notes ||
        substitutions.length > 0 ||
        modifiers.length > 0) && (
        <div className="space-y-2">
          {order.proteinBoost && (
            <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-2 text-sm text-orange-700">
              <IconFlame className="h-4 w-4" />
              <span className="font-semibold">Protein Boost</span>
            </div>
          )}

          {substitutions.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Substitutions
              </p>
              {substitutions.map((sub, index) => (
                <div key={index} className="text-muted-foreground">
                  {sub.groupName}:{" "}
                  <span className="text-foreground">{sub.optionName}</span>
                </div>
              ))}
            </div>
          )}

          {modifiers.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Modifiers
              </p>
              {modifiers.map((mod, index) => (
                <div key={index} className="text-muted-foreground">
                  {mod.groupName}:{" "}
                  <span className="text-foreground">
                    {(mod.optionNames || []).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {order.notes && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              <div className="flex items-start gap-2">
                <IconNote className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!order.proteinBoost &&
        !order.notes &&
        substitutions.length === 0 &&
        modifiers.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No customizations
          </p>
        )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {customerEmail && (
            <Badge variant="secondary" className="text-xs break-all">
              {customerEmail}
            </Badge>
          )}
          {customerPhone && (
            <Badge variant="secondary" className="text-xs break-all">
              {customerPhone}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {order.deliveryMethod === "PICKUP"
              ? `Pickup • ${order.pickupLocation || DEFAULT_PICKUP_LOCATION}`
              : "Delivery"}
          </Badge>
        </div>
        <span className="shrink-0">Order #{order.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

interface LogisticsSidebarProps {
  customerEmail: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  deliveryNotes: string | null;
  pickupOrders: OrderWithRelations[];
  orders: OrderWithRelations[];
  pickupLocation: string;
  isUpdating: boolean;
  onMarkAllPreparing: () => void;
  onMarkAllDelivered: () => void;
}

function LogisticsSidebar({
  customerEmail,
  customerPhone,
  deliveryAddress,
  deliveryCity,
  deliveryPostal,
  deliveryNotes,
  pickupOrders,
  orders,
  pickupLocation,
  isUpdating,
  onMarkAllPreparing,
  onMarkAllDelivered,
}: LogisticsSidebarProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Customer & Logistics
      </h3>

      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4 space-y-3">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contact
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <IconMail className="w-4 h-4 text-muted-foreground" />
                <span>{customerEmail || "No email on file"}</span>
              </div>
              {customerPhone && (
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${customerPhone}`} className="hover:underline">
                    {customerPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Fulfillment
            </h4>
            {pickupOrders.length === orders.length ? (
              <div className="flex items-start gap-2 text-sm">
                <IconMapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div>Pickup at {pickupLocation}</div>
                  <div className="text-muted-foreground">
                    No delivery needed
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <IconMapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div>
                      {deliveryAddress ? "Delivery" : "No address on file"}
                    </div>
                    {deliveryAddress && (
                      <div className="text-muted-foreground">
                        {[deliveryAddress, deliveryCity, deliveryPostal]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {pickupOrders.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {pickupOrders.length} pickup order
                    {pickupOrders.length === 1 ? "" : "s"} at {pickupLocation}
                  </div>
                )}
              </div>
            )}
          </div>

          {deliveryNotes && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-semibold text-amber-600 mb-1">
                Delivery Notes
              </h4>
              <p className="text-sm italic text-amber-700 bg-amber-50 p-2 rounded">
                {deliveryNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onMarkAllPreparing}
          size="sm"
          variant="outline"
          disabled={isUpdating || orders.every((o) => o.status !== "PAID")}
        >
          Mark All Preparing
        </Button>
        <Button
          onClick={onMarkAllDelivered}
          size="sm"
          disabled={
            isUpdating ||
            orders.every(
              (o) => o.status === "DELIVERED" || o.status === "CANCELLED",
            )
          }
        >
          <IconTruckDelivery className="mr-2 h-4 w-4" />
          Mark All Delivered
        </Button>
      </div>
    </section>
  );
}
