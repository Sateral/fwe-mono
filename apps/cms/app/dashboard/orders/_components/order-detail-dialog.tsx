"use client";

import * as React from "react";
import {
  IconCheck,
  IconChefHat,
  IconFlame,
  IconNote,
  IconTruckDelivery,
  IconX,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "./status-badge";
import { useUpdateFulfillmentStatus } from "@/hooks/use-orders";
import {
  DEFAULT_PICKUP_LOCATION,
  PAYMENT_STATUS_CONFIG,
} from "@/lib/constants/order.constants";
import type {
  OrderWithRelations,
  FulfillmentStatus,
  OrderSubstitution,
} from "@/lib/types/order-types";

interface OrderDetailDialogProps {
  order: OrderWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailDialogProps) {
  const [cancelConfirmationOpen, setCancelConfirmationOpen] =
    React.useState(false);
  const [localFulfillmentStatus, setLocalFulfillmentStatus] =
    React.useState<FulfillmentStatus>("NEW");

  const updateStatusMutation = useUpdateFulfillmentStatus();

  React.useEffect(() => {
    if (!order) return;
    setLocalFulfillmentStatus(order.fulfillmentStatus as FulfillmentStatus);
  }, [order?.id, order?.fulfillmentStatus]);

  if (!order) return null;

  const substitutions =
    (order.substitutions as OrderSubstitution[] | null) || [];
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus];
  const canUpdateFulfillment = order.paymentStatus === "PAID";

  const effectiveFulfillmentStatus = localFulfillmentStatus;

  const handleStatusUpdate = (newStatus: FulfillmentStatus) => {
    const previousStatus = effectiveFulfillmentStatus;
    setLocalFulfillmentStatus(newStatus);
    updateStatusMutation.mutate(
      {
        orderId: order.id,
        fulfillmentStatus: newStatus,
      },
      {
        onError: () => {
          setLocalFulfillmentStatus(previousStatus);
        },
      },
    );
  };

  const handleCancel = () => {
    handleStatusUpdate("CANCELLED");
    setCancelConfirmationOpen(false);
  };

  // Determine next status action
  const getNextStatusAction = () => {
    switch (effectiveFulfillmentStatus) {
      case "NEW":
        return {
          label: "Start Preparing",
          status: "PREPARING" as FulfillmentStatus,
          icon: IconChefHat,
        };
      case "PREPARING":
        return {
          label: "Mark Ready",
          status: "READY" as FulfillmentStatus,
          icon: IconCheck,
        };
      case "READY":
        return {
          label: "Mark Delivered",
          status: "DELIVERED" as FulfillmentStatus,
          icon: IconTruckDelivery,
        };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusAction();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] sm:max-w-4xl lg:max-w-6xl max-h-[92vh] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5">
            <div className="mr-8 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Order #{order.id.slice(0, 8)}
                </DialogTitle>
                <DialogDescription>
                  {new Date(order.createdAt).toLocaleString()}
                </DialogDescription>
              </div>
              <StatusBadge
                status={effectiveFulfillmentStatus}
              />
            </div>
          </DialogHeader>

          <div className="overflow-y-auto px-6 pb-6 pt-4">
            <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 text-lg font-semibold">
                  ${order.totalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.currency?.toUpperCase() ?? "CAD"}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Quantity
                </p>
                <p className="mt-1 text-lg font-semibold">{order.quantity}</p>
                <p className="text-xs text-muted-foreground">
                  ${order.unitPrice.toFixed(2)} each
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Payment
                </p>
                <Badge
                  variant="outline"
                  className={`${paymentConfig.bgColor} mt-1 border-0`}
                >
                  <span
                    className={`mr-1.5 h-2 w-2 rounded-full ${paymentConfig.dotColor}`}
                  />
                  {paymentConfig.label}
                </Badge>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Fulfillment
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {order.deliveryMethod === "PICKUP" ? "Pickup" : "Delivery"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.deliveryMethod === "PICKUP"
                    ? order.pickupLocation || DEFAULT_PICKUP_LOCATION
                    : order.user?.deliveryAddress || "No address on file"}
                </p>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7 xl:col-span-8">
                <section className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Order Details
                  </h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div>
                      <p className="text-xl font-semibold tracking-tight">
                        {order.meal?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {order.quantity} x ${order.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xl font-bold">${order.totalAmount.toFixed(2)}</p>
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <IconChefHat className="h-4 w-4" />
                    Customizations For Chef
                  </h3>
                  <div className="mt-3 space-y-3">
                    {order.proteinBoost && (
                      <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
                        <div className="rounded-full bg-orange-500 p-2 text-white">
                          <IconFlame className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-orange-700 dark:text-orange-300">
                            PROTEIN BOOST
                          </p>
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            Add extra protein to this order
                          </p>
                        </div>
                      </div>
                    )}

                    {substitutions.length > 0 && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                        <p className="mb-2 text-sm font-medium">Substitutions</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {substitutions.map((sub, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-lg bg-background/70 px-2 py-1.5 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {sub.groupName}
                              </span>
                              <Badge variant="secondary" className="font-medium">
                                {sub.optionName}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950">
                        <div className="flex items-start gap-2">
                          <IconNote className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <p className="mb-1 font-bold text-yellow-700 dark:text-yellow-300">
                              SPECIAL NOTES
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-yellow-800 dark:text-yellow-200">
                              {order.notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!order.proteinBoost &&
                      substitutions.length === 0 &&
                      !order.notes && (
                        <p className="text-sm italic text-muted-foreground">
                          No special customizations for this order
                        </p>
                      )}
                  </div>
                </section>
              </div>

              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <section className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Customer
                  </h3>
                  <p className="mt-3 font-medium">{order.user?.name || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.user?.email || "No email on file"}
                  </p>
                </section>

                <section className="rounded-xl border bg-card p-4 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Payment & Fulfillment
                  </h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-medium">
                        {order.deliveryMethod === "PICKUP" ? "Pickup" : "Delivery"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">
                        {order.deliveryMethod === "PICKUP" ? "Location" : "Address"}
                      </p>
                      <p className="font-medium">
                        {order.deliveryMethod === "PICKUP"
                          ? order.pickupLocation || DEFAULT_PICKUP_LOCATION
                          : order.user?.deliveryAddress
                            ? `${order.user.deliveryAddress}, ${[
                                order.user.deliveryCity,
                                order.user.deliveryPostal,
                              ]
                                .filter(Boolean)
                                .join(", ")}`
                            : "No address on file"}
                      </p>
                    </div>
                    {order.paidAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="font-medium">
                          {new Date(order.paidAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {order.refundedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Refunded</span>
                        <span className="font-medium">
                          {new Date(order.refundedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Update Status
                  </h3>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Select
                        value={effectiveFulfillmentStatus}
                        onValueChange={(value) =>
                          handleStatusUpdate(value as FulfillmentStatus)
                        }
                        disabled={
                          !canUpdateFulfillment || updateStatusMutation.isPending
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-gray-500" />
                              New
                            </div>
                          </SelectItem>
                          <SelectItem value="PREPARING">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                              Preparing
                            </div>
                          </SelectItem>
                          <SelectItem value="READY">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              Ready
                            </div>
                          </SelectItem>
                          <SelectItem value="DELIVERED">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              Delivered
                            </div>
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-500" />
                              Cancelled
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Change status freely if you need to correct a mistake
                      </p>
                    </div>

                    {nextAction &&
                      effectiveFulfillmentStatus !== "DELIVERED" &&
                      effectiveFulfillmentStatus !== "CANCELLED" && (
                        <Button
                          onClick={() => handleStatusUpdate(nextAction.status)}
                          disabled={
                            !canUpdateFulfillment || updateStatusMutation.isPending
                          }
                          className="w-full"
                          size="lg"
                        >
                          <nextAction.icon className="mr-2 h-5 w-5" />
                          {nextAction.label}
                        </Button>
                      )}

                    {effectiveFulfillmentStatus === "DELIVERED" && (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-2 text-green-600 dark:bg-green-950">
                        <IconCheck className="h-5 w-5" />
                        <span className="font-medium">Order Completed</span>
                      </div>
                    )}

                    {effectiveFulfillmentStatus === "CANCELLED" && (
                      <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 py-2 text-red-600 dark:bg-red-950">
                        <IconX className="h-5 w-5" />
                        <span className="font-medium">Order Cancelled</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelConfirmationOpen}
        onOpenChange={setCancelConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelConfirmationOpen(false)}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? "Cancelling..."
                : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
