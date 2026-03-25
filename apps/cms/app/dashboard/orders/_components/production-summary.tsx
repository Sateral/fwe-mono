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
import type { OrderModifier, OrderSubstitution } from "@/lib/types/order-types";

interface ProductionSummaryProps {
  variant?: "full" | "compact";
  fullManifestHref?: string;
}

export function ProductionSummary({
  variant = "full",
  fullManifestHref = "/dashboard/orders/prep-manifest",
}: ProductionSummaryProps) {
  const { selectedRotationId } = useSelectedRotation();
  const { data: orders = [], isLoading } =
    useOrdersByRotation(selectedRotationId);

  const manifest = React.useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.paymentStatus === "PAID" &&
        order.fulfillmentStatus !== "CANCELLED",
    );

    const mealMap = new Map<
      string,
      {
        mealId: string;
        mealName: string;
        totalQty: number;
        standardQty: number;
        boostQty: number;
        substitutions: Map<string, number>;
        modifiers: Map<string, number>;
        notes: Array<{
          orderId: string;
          customerName: string;
          quantity: number;
          note: string;
        }>;
      }
    >();

    const substitutionDemand = new Map<string, number>();
    const modifierDemand = new Map<string, number>();

    const parseSubstitutions = (value: unknown): OrderSubstitution[] => {
      if (!Array.isArray(value)) return [];
      return value
        .filter(
          (item): item is { groupName: string; optionName: string } =>
            typeof item === "object" &&
            item !== null &&
            "groupName" in item &&
            "optionName" in item &&
            typeof item.groupName === "string" &&
            typeof item.optionName === "string",
        )
        .map((item) => ({
          groupName: item.groupName,
          optionName: item.optionName,
        }));
    };

    const parseModifiers = (value: unknown): OrderModifier[] => {
      if (!Array.isArray(value)) return [];
      return value
        .filter(
          (item): item is { groupName: string; optionNames: string[] } =>
            typeof item === "object" &&
            item !== null &&
            "groupName" in item &&
            "optionNames" in item &&
            typeof item.groupName === "string" &&
            Array.isArray(item.optionNames) &&
            item.optionNames.every((name: string) => typeof name === "string"),
        )
        .map((item) => ({
          groupName: item.groupName,
          optionNames: item.optionNames,
        }));
    };

    for (const order of activeOrders) {
      const substitutions = parseSubstitutions(order.substitutions);
      const modifiers = parseModifiers(order.modifiers);

      if (!mealMap.has(order.mealId)) {
        mealMap.set(order.mealId, {
          mealId: order.mealId,
          mealName: order.meal?.name || "Unknown meal",
          totalQty: 0,
          standardQty: 0,
          boostQty: 0,
          substitutions: new Map(),
          modifiers: new Map(),
          notes: [],
        });
      }

      const entry = mealMap.get(order.mealId);
      if (!entry) continue;

      const quantity = order.quantity;
      entry.totalQty += quantity;

      const hasCustomizations =
        order.proteinBoost ||
        substitutions.length > 0 ||
        modifiers.length > 0 ||
        Boolean(order.notes);

      if (!hasCustomizations) {
        entry.standardQty += quantity;
      }

      if (order.proteinBoost) {
        entry.boostQty += quantity;
      }

      for (const sub of substitutions) {
        const key = `${sub.groupName}: ${sub.optionName}`;
        entry.substitutions.set(
          key,
          (entry.substitutions.get(key) || 0) + quantity,
        );
        substitutionDemand.set(
          key,
          (substitutionDemand.get(key) || 0) + quantity,
        );
      }

      for (const mod of modifiers) {
        for (const optionName of mod.optionNames) {
          const key = `${mod.groupName}: ${optionName}`;
          entry.modifiers.set(key, (entry.modifiers.get(key) || 0) + quantity);
          modifierDemand.set(key, (modifierDemand.get(key) || 0) + quantity);
        }
      }

      if (order.notes) {
        entry.notes.push({
          orderId: order.id,
          customerName: order.user?.name || order.user?.email || "Guest",
          quantity,
          note: order.notes,
        });
      }
    }

    const meals = Array.from(mealMap.values()).sort((a, b) =>
      b.totalQty === a.totalQty
        ? a.mealName.localeCompare(b.mealName)
        : b.totalQty - a.totalQty,
    );

    const totalPortions = meals.reduce((acc, meal) => acc + meal.totalQty, 0);
    const standardPortions = meals.reduce(
      (acc, meal) => acc + meal.standardQty,
      0,
    );
    const customizedPortions = totalPortions - standardPortions;
    const boostPortions = meals.reduce((acc, meal) => acc + meal.boostQty, 0);
    const noteCount = meals.reduce((acc, meal) => acc + meal.notes.length, 0);

    const exceptionRows = meals.flatMap((meal) => {
      const rows: Array<{
        mealName: string;
        label: string;
        count: number;
        tone: "default" | "warn";
      }> = [];

      if (meal.boostQty > 0) {
        rows.push({
          mealName: meal.mealName,
          label: "Protein boost",
          count: meal.boostQty,
          tone: "default",
        });
      }

      for (const [label, count] of meal.substitutions.entries()) {
        rows.push({
          mealName: meal.mealName,
          label: `Sub: ${label}`,
          count,
          tone: "default",
        });
      }

      for (const [label, count] of meal.modifiers.entries()) {
        rows.push({
          mealName: meal.mealName,
          label: `Mod: ${label}`,
          count,
          tone: "default",
        });
      }

      for (const note of meal.notes) {
        rows.push({
          mealName: meal.mealName,
          label: `Note (${note.customerName}): ${note.note}`,
          count: note.quantity,
          tone: "warn",
        });
      }

      return rows;
    });

    const grocerySignals = [
      ...Array.from(substitutionDemand.entries()).map(([label, count]) => ({
        type: "Substitution",
        label,
        count,
      })),
      ...Array.from(modifierDemand.entries()).map(([label, count]) => ({
        type: "Modifier",
        label,
        count,
      })),
    ].sort((a, b) => b.count - a.count);

    return {
      meals,
      totalPortions,
      standardPortions,
      customizedPortions,
      boostPortions,
      noteCount,
      exceptionRows,
      grocerySignals,
      activeOrderCount: activeOrders.length,
    };
  }, [orders]);

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
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Prep Manifest</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {manifest.totalPortions} portions
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Quick prep snapshot. Open full details for substitutions and notes.
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Prep Manifest</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {manifest.totalPortions} portions
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Chef view of meal totals, customizations, and exceptions for this
          rotation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">
            {manifest.activeOrderCount} paid orders
          </Badge>
          <Badge variant="outline">
            {manifest.standardPortions} standard portions
          </Badge>
          <Badge variant="outline">
            {manifest.customizedPortions} customized portions
          </Badge>
          <Badge variant="outline">
            {manifest.boostPortions} protein boosts
          </Badge>
          <Badge variant={manifest.noteCount > 0 ? "destructive" : "outline"}>
            {manifest.noteCount} special notes
          </Badge>
        </div>

        <div className="max-h-[560px] space-y-4 overflow-y-auto pr-2">
          {manifest.meals.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No paid orders for this rotation yet.
            </div>
          )}

          {manifest.meals.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Meal Production Totals
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

          {manifest.grocerySignals.length > 0 && (
            <section>
              <Separator className="mb-4" />
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Grocery Signals From Choices
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                These counts show option demand to guide purchasing and prep.
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
                Prep Exceptions
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">
                Items requiring non-standard prep.
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
                      <Badge
                        variant={
                          row.tone === "warn" ? "destructive" : "outline"
                        }
                      >
                        x{row.count}
                      </Badge>
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
