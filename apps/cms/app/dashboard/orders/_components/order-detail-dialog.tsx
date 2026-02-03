"use client";

import * as React from "react";
import {
  IconCheck,
  IconChefHat,
  IconFileDownload,
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
import { useUpdateOrderStatus } from "@/hooks/use-orders";
import { DEFAULT_PICKUP_LOCATION } from "@/lib/constants/order.constants";
import type {
  OrderWithRelations,
  OrderStatus,
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

  const updateStatusMutation = useUpdateOrderStatus();

  if (!order) return null;

  const substitutions =
    (order.substitutions as OrderSubstitution[] | null) || [];

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    updateStatusMutation.mutate({ orderId: order.id, status: newStatus });
  };

  const handleCancel = () => {
    handleStatusUpdate("CANCELLED");
    setCancelConfirmationOpen(false);
  };

  const handleDownloadPDF = async () => {
    const { generateOrderPDF } = await import("./order-pdf");
    await generateOrderPDF(order);
  };

  // Determine next status action
  const getNextStatusAction = () => {
    switch (order.status) {
      case "PAID":
        return {
          label: "Start Preparing",
          status: "PREPARING" as OrderStatus,
          icon: IconChefHat,
        };
      case "PREPARING":
        return {
          label: "Mark Delivered",
          status: "DELIVERED" as OrderStatus,
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
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between mr-8">
              <DialogTitle className="font-mono text-lg">
                Order #{order.id.slice(0, 8)}
              </DialogTitle>
              <StatusBadge status={order.status as OrderStatus} />
            </div>
            <DialogDescription>
              {new Date(order.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                CUSTOMER
              </h3>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{order.user?.name || "Guest"}</p>
                <p className="text-sm text-muted-foreground">
                  {order.user?.email}
                </p>
              </div>
            </section>

            {/* Fulfillment Info */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                FULFILLMENT
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">
                    {order.deliveryMethod === "PICKUP" ? "Pickup" : "Delivery"}
                  </span>
                </div>
                {order.deliveryMethod === "PICKUP" ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">
                      {order.pickupLocation || DEFAULT_PICKUP_LOCATION}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {order.user?.deliveryAddress
                        ? `${order.user.deliveryAddress}, ${[
                            order.user.deliveryCity,
                            order.user.deliveryPostal,
                          ]
                            .filter(Boolean)
                            .join(", ")}`
                        : "No address on file"}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Meal Details */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                ORDER DETAILS
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{order.meal?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {order.quantity} × ${order.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-lg">
                    ${order.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Customizations - Chef Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <IconChefHat className="h-4 w-4" />
                CUSTOMIZATIONS FOR CHEF
              </h3>

              {/* Protein Boost */}
              {order.proteinBoost && (
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-orange-500 text-white p-2 rounded-full">
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

              {/* Substitutions */}
              {substitutions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Substitutions:</p>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                    {substitutions.map((sub, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {sub.groupName}:
                        </span>
                        <Badge variant="secondary" className="font-medium">
                          {sub.optionName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Notes */}
              {order.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <IconNote className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-yellow-700 dark:text-yellow-300 mb-1">
                        SPECIAL NOTES
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                        {order.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No customizations message */}
              {!order.proteinBoost &&
                substitutions.length === 0 &&
                !order.notes && (
                  <p className="text-sm text-muted-foreground italic">
                    No special customizations for this order
                  </p>
                )}
            </section>

            <Separator />

            {/* Actions */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                UPDATE STATUS
              </h3>

              {/* Status dropdown for flexible changes */}
              <div className="space-y-2">
                <Select
                  value={order.status}
                  onValueChange={(value) =>
                    handleStatusUpdate(value as OrderStatus)
                  }
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Paid
                      </div>
                    </SelectItem>
                    <SelectItem value="PREPARING">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        Preparing
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Delivered
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Cancelled
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Change status freely if you need to correct a mistake
                </p>
              </div>

              {/* Quick action buttons */}
              {nextAction &&
                order.status !== "DELIVERED" &&
                order.status !== "CANCELLED" && (
                  <Button
                    onClick={() => handleStatusUpdate(nextAction.status)}
                    disabled={updateStatusMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    <nextAction.icon className="mr-2 h-5 w-5" />
                    {nextAction.label}
                  </Button>
                )}

              {/* Completed/Cancelled state indicator */}
              {order.status === "DELIVERED" && (
                <div className="flex items-center justify-center gap-2 text-green-600 py-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <IconCheck className="h-5 w-5" />
                  <span className="font-medium">Order Completed</span>
                </div>
              )}

              {order.status === "CANCELLED" && (
                <div className="flex items-center justify-center gap-2 text-red-600 py-2 bg-red-50 dark:bg-red-950 rounded-lg">
                  <IconX className="h-5 w-5" />
                  <span className="font-medium">Order Cancelled</span>
                </div>
              )}

              <Separator />

              {/* Other actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="flex-1"
                >
                  <IconFileDownload className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </section>
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
