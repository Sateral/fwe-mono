"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconSearch,
  IconClock,
  IconCheck,
  IconPackage,
  IconTruck,
} from "@tabler/icons-react";
import { OrderDetailDialog } from "./order-detail-dialog";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import {
  useOrdersByRotation,
  useUpdateFulfillmentStatus,
} from "@/hooks/use-orders";
import { getOrderColumns } from "@/lib/table-columns/order-columns";
import { FULFILLMENT_STATUS_FLOW } from "@/lib/constants/order.constants";
import type {
  FulfillmentStatus,
  OrderWithRelations,
} from "@/lib/types/order-types";

export function OrdersTable() {
  const { selectedRotationId } = useSelectedRotation();
  const { data: orders = [], isLoading } =
    useOrdersByRotation(selectedRotationId);
  const updateStatusMutation = useUpdateFulfillmentStatus();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [selectedOrder, setSelectedOrder] =
    React.useState<OrderWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Handle quick status update
  const handleQuickUpdate = React.useCallback(
    (order: OrderWithRelations) => {
      if (order.paymentStatus !== "PAID") return;
      const statusAction =
        FULFILLMENT_STATUS_FLOW[order.fulfillmentStatus as FulfillmentStatus];
      if (!statusAction) return;

      updateStatusMutation.mutate({
        orderId: order.id,
        fulfillmentStatus: statusAction.nextStatus,
      });
    },
    [updateStatusMutation],
  );

  // Handle view order
  const handleViewOrder = React.useCallback((order: OrderWithRelations) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  }, []);

  // Memoized status counts
  const statusCounts = React.useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc[order.fulfillmentStatus as FulfillmentStatus] =
          (acc[order.fulfillmentStatus as FulfillmentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<FulfillmentStatus, number>,
    );
  }, [orders]);

  // Memoized columns
  const columns = React.useMemo(
    () =>
      getOrderColumns({
        onQuickUpdate: handleQuickUpdate,
        onViewOrder: handleViewOrder,
        isPending: updateStatusMutation.isPending,
        pendingOrderId: updateStatusMutation.variables?.orderId,
      }),
    [
      handleQuickUpdate,
      handleViewOrder,
      updateStatusMutation.isPending,
      updateStatusMutation.variables?.orderId,
    ],
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Orders</CardTitle>
            <div className="flex items-center gap-4">
              {/* Status counts */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  <IconPackage className="w-3 h-3" />
                  {statusCounts.NEW || 0} New
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <IconClock className="w-3 h-3" />
                  {statusCounts.PREPARING || 0} Preparing
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <IconCheck className="w-3 h-3" />
                  {statusCounts.READY || 0} Ready
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <IconTruck className="w-3 h-3" />
                  {statusCounts.DELIVERED || 0} Done
                </Badge>
              </div>
              {/* Search */}
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
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
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
