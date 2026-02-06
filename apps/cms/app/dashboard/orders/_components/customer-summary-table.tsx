"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useOrdersByRotation } from "@/hooks/use-orders";
import {
  getCustomerColumns,
  CustomerSummary,
} from "@/lib/table-columns/customer-columns";
import { DEFAULT_PICKUP_LOCATION } from "@/lib/constants/order.constants";
import type { OrderWithRelations, OrderUser } from "@/lib/types/order-types";

interface CustomerSummaryTableProps {
  onSelectCustomer: (orders: OrderWithRelations[]) => void;
}

export function CustomerSummaryTable({
  onSelectCustomer,
}: CustomerSummaryTableProps) {
  const { selectedRotationId } = useSelectedRotation();
  const { data: orders = [], isLoading } =
    useOrdersByRotation(selectedRotationId);

  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Aggregate orders by customer
  const customers = React.useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((order) => {
      if (order.paymentStatus !== "PAID") return;
      if (order.fulfillmentStatus === "CANCELLED") return;
      const key = order.userId || order.user?.email || "Guest";
      const user = order.user as OrderUser | null;

      if (!map.has(key)) {
        map.set(key, {
          userId: order.userId,
          name: user?.name || "Guest",
          email: user?.email || "No Email",
          phone: user?.phone || null,
          deliveryAddress: user?.deliveryAddress || null,
          deliveryCity: user?.deliveryCity || null,
          deliveryPostal: user?.deliveryPostal || null,
          deliveryNotes: user?.deliveryNotes || null,
          deliveryMethodSummary: "DELIVERY",
          pickupLocation: null,
          mealBreakdown: [],
          orderCount: 0,
          totalSpend: 0,
          status: "NEW",
          orders: [],
        });
      }

      const entry = map.get(key)!;
      entry.orders.push(order);
      entry.orderCount += order.quantity;
      entry.totalSpend += order.totalAmount;

      // Determine delivery method summary
      const pickupOrders = entry.orders.filter(
        (o) => o.deliveryMethod === "PICKUP",
      );
      const deliveryOrders = entry.orders.filter(
        (o) => o.deliveryMethod !== "PICKUP",
      );

      if (pickupOrders.length === 0) {
        entry.deliveryMethodSummary = "DELIVERY";
      } else if (deliveryOrders.length === 0) {
        entry.deliveryMethodSummary = "PICKUP";
        entry.pickupLocation =
          pickupOrders[0]?.pickupLocation || DEFAULT_PICKUP_LOCATION;
      } else {
        entry.deliveryMethodSummary = "MIXED";
        entry.pickupLocation =
          pickupOrders[0]?.pickupLocation || DEFAULT_PICKUP_LOCATION;
      }
    });

    // Determine aggregate status per customer
    return Array.from(map.values()).map((c) => {
      const statuses = c.orders.map((o) => o.fulfillmentStatus);
      let aggStatus: CustomerSummary["status"] = "NEW";

      if (statuses.every((s) => s === "DELIVERED")) aggStatus = "DELIVERED";
      else if (statuses.some((s) => s === "DELIVERED")) aggStatus = "PARTIAL";
      else if (statuses.some((s) => s === "READY")) aggStatus = "READY";
      else if (statuses.some((s) => s === "PREPARING")) aggStatus = "PREPARING";

      const mealMap = new Map<string, number>();
      c.orders.forEach((order) => {
        const name = order.meal?.name || "Unknown meal";
        const current = mealMap.get(name) || 0;
        mealMap.set(name, current + order.quantity);
      });
      const mealBreakdown = Array.from(mealMap.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);

      return { ...c, status: aggStatus, mealBreakdown };
    });
  }, [orders]);

  // Memoized columns
  const columns = React.useMemo(
    () => getCustomerColumns({ onSelectCustomer }),
    [onSelectCustomer],
  );

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        No orders found for this week.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/30">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/40">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
