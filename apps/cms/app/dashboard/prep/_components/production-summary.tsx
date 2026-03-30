"use client";

import * as React from "react";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useOrdersByRotation } from "@/hooks/use-orders";
import { getEffectiveOrderFulfillment } from "@/lib/order-fulfillment-contact";
import {
  aggregatePrepByMeal,
  buildGrocerySignalsFromOrders,
  isOrderActiveForPrep,
  type MealPrepSummary,
} from "@/lib/prep-aggregate";
import type { OrderWithRelations } from "@/lib/types/order-types";

interface ProductionSummaryProps {
  variant?: "full" | "compact";
  fullManifestHref?: string;
}

function buildManifestFromOrders(orders: OrderWithRelations[]) {
  const activeOrders = orders.filter(isOrderActiveForPrep);
  const summaries = aggregatePrepByMeal(orders);

  const meals = summaries.map((s) => {
    const standardQty = s.variations
      .filter((v) => v.label === "Standard")
      .reduce((acc, v) => acc + v.count, 0);
    return {
      mealId: s.mealId,
      mealName: s.mealName,
      totalQty: s.totalQuantity,
      standardQty,
    };
  });

  const totalPortions = summaries.reduce((acc, s) => acc + s.totalQuantity, 0);
  const standardPortions = meals.reduce((acc, m) => acc + m.standardQty, 0);
  const customizedPortions = totalPortions - standardPortions;
  const noteCount = activeOrders.filter((o) => Boolean(o.notes?.trim())).length;

  const grocerySignals = buildGrocerySignalsFromOrders(activeOrders);

  const exceptionRows = activeOrders
    .filter((o) => Boolean(o.notes?.trim()))
    .map((order) => {
      const eff = getEffectiveOrderFulfillment(order);
      return {
        mealName: order.meal?.name || "Unknown meal",
        label: `Note (${eff.customerName}): ${order.notes}`,
        count: order.quantity,
        tone: "warn" as const,
      };
    });

  const configLines = summaries
    .flatMap((s) =>
      s.variations.map((v) => ({
        mealName: s.mealName,
        label: v.label,
        count: v.count,
      })),
    )
    .sort((a, b) =>
      b.count === a.count ? a.mealName.localeCompare(b.mealName) : b.count - a.count,
    );

  return {
    meals,
    summaries,
    totalPortions,
    standardPortions,
    customizedPortions,
    noteCount,
    exceptionRows,
    grocerySignals,
    activeOrderCount: activeOrders.length,
    configLines,
  };
}

export function ProductionSummary({
  variant = "full",
  fullManifestHref = "/dashboard/prep",
}: ProductionSummaryProps) {
  const { selectedRotationId } = useSelectedRotation();
  const { data: orders = [], isLoading } =
    useOrdersByRotation(selectedRotationId);

  const manifest = React.useMemo(
    () => buildManifestFromOrders(orders),
    [orders],
  );

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    const topConfigs = manifest.configLines.slice(0, 4);
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Prep manifest</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {manifest.totalPortions} portions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Quick snapshot. Open full manifest for every build line.
          </p>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              {manifest.activeOrderCount} paid orders
            </Badge>
            <Badge variant="outline">
              {manifest.customizedPortions} customized
            </Badge>
            <Badge variant={manifest.noteCount > 0 ? "destructive" : "outline"}>
              {manifest.noteCount} notes
            </Badge>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Meal</th>
                  <th className="px-3 py-2 text-center">Total</th>
                  <th className="px-3 py-2 text-center">Custom</th>
                </tr>
              </thead>
              <tbody>
                {manifest.meals.slice(0, 4).map((meal) => {
                  const customCount = meal.totalQty - meal.standardQty;
                  return (
                    <tr key={meal.mealId} className="border-t">
                      <td className="px-3 py-2 font-medium">{meal.mealName}</td>
                      <td className="px-3 py-2 text-center">{meal.totalQty}</td>
                      <td className="px-3 py-2 text-center">{customCount}</td>
                    </tr>
                  );
                })}
                {manifest.meals.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                      No paid orders for this rotation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {topConfigs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Top builds
              </p>
              <ul className="space-y-1.5 text-xs">
                {topConfigs.map((line, i) => (
                  <li
                    key={`${line.mealName}-${line.label}-${i}`}
                    className="flex justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{line.mealName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        - {line.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      x{line.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto border-t pt-3">
            <Link
              href={fullManifestHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <IconArrowLeft className="h-4 w-4" />
              Full prep manifest
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full print:shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Prep manifest</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {manifest.totalPortions} portions
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Totals, identical builds (defaults excluded from custom), grocery
          demand, and per-customer notes for this rotation.
        </p>
      </CardHeader>
      <CardContent className="print-manifest">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{manifest.activeOrderCount} paid orders</Badge>
          <Badge variant="outline">
            {manifest.standardPortions} standard portions
          </Badge>
          <Badge variant="outline">
            {manifest.customizedPortions} customized portions
          </Badge>
          <Badge variant={manifest.noteCount > 0 ? "destructive" : "outline"}>
            {manifest.noteCount} special notes
          </Badge>
        </div>

        <div className="max-h-[560px] space-y-4 overflow-y-auto pr-2 print:max-h-none">
          {manifest.meals.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No paid orders for this rotation yet.
            </div>
          )}

          {manifest.meals.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Meal production totals
              </h4>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Meal</th>
                      <th className="px-3 py-2 text-center">Total</th>
                      <th className="px-3 py-2 text-center">Standard</th>
                      <th className="px-3 py-2 text-center">Custom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.meals.map((meal) => {
                      const customCount = meal.totalQty - meal.standardQty;
                      return (
                        <tr key={meal.mealId} className="border-t">
                          <td className="px-3 py-2">
                            <span className="font-medium">{meal.mealName}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {meal.totalQty}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {meal.standardQty}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {customCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {manifest.summaries.length > 0 && (
            <section>
              <Separator className="mb-4" />
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Prep by configuration
              </h4>
              <p className="mb-3 text-xs text-muted-foreground">
                Grouped after treating each meal&apos;s default substitution as
                standard. Counts are portions.
              </p>
              <div className="space-y-4">
                {manifest.summaries.map((meal: MealPrepSummary) => (
                  <div
                    key={meal.mealId}
                    className="rounded-lg border bg-muted/20 p-3"
                  >
                    <p className="mb-2 font-semibold">
                      {meal.mealName}
                      {meal.assignedQuantity > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({meal.assignedQuantity} chef-assigned)
                        </span>
                      )}
                    </p>
                    <ul className="space-y-2">
                      {meal.variations.map((v) => (
                        <li
                          key={v.configKey}
                          className="flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 break-words">{v.label}</span>
                          <Badge variant="outline" className="shrink-0">
                            x{v.count}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {manifest.grocerySignals.length > 0 && (
            <section>
              <Separator className="mb-4" />
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Grocery signals from choices
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                All recorded options (including defaults), weighted by portion
                count.
              </p>
              <div className="space-y-2">
                {manifest.grocerySignals.slice(0, 16).map((signal) => (
                  <div
                    key={`${signal.type}-${signal.label}`}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {signal.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {signal.type}
                      </p>
                    </div>
                    <Badge variant="outline">x{signal.count}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {manifest.exceptionRows.length > 0 && (
            <section>
              <Separator className="mb-4" />
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Customer notes
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                Read before packing; tied to order-time snapshot name.
              </p>
              <div className="space-y-2">
                {manifest.exceptionRows.map((row, index) => (
                  <div
                    key={`${row.mealName}-${row.label}-${index}`}
                    className="rounded-lg border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{row.mealName}</p>
                        <p className="break-words text-xs text-muted-foreground">
                          {row.label}
                        </p>
                      </div>
                      <Badge variant="destructive">x{row.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
