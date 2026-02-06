"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useOrdersByRotation, useProductionSummary } from "@/hooks/use-orders";
import type { OrderModifier, OrderSubstitution } from "@/lib/types/order-types";

export function ProductionSummary() {
  const { selectedRotationId } = useSelectedRotation();
  const { data: summary = [], isLoading } =
    useProductionSummary(selectedRotationId);
  const { data: orders = [] } = useOrdersByRotation(selectedRotationId);

  const totalMeals = summary.reduce((acc, item) => acc + item.count, 0);

  // Group by type
  const specials = summary.filter((i) => i.isRotating);
  const signatures = summary.filter((i) => !i.isRotating);

  const prepMeta = new Map<
    string,
    { boosts: number; subs: number; mods: number; notes: number }
  >();

  for (const order of orders) {
    if (order.paymentStatus !== "PAID") continue;
    if (order.fulfillmentStatus === "CANCELLED") continue;
    if (!order.mealId) continue;

    const substitutions = Array.isArray(order.substitutions)
      ? (order.substitutions as OrderSubstitution[])
      : [];
    const modifiers = Array.isArray(order.modifiers)
      ? (order.modifiers as OrderModifier[])
      : [];

    if (!prepMeta.has(order.mealId)) {
      prepMeta.set(order.mealId, { boosts: 0, subs: 0, mods: 0, notes: 0 });
    }

    const entry = prepMeta.get(order.mealId)!;
    if (order.proteinBoost) entry.boosts += order.quantity;
    if (substitutions.length > 0) entry.subs += order.quantity;
    if (modifiers.length > 0) entry.mods += order.quantity;
    if (order.notes) entry.notes += order.quantity;
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
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

  return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Prep Manifest</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {totalMeals} meals
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Counts show meals that need boosts, substitutions, modifiers, or notes.
          </p>
        </CardHeader>
        <CardContent>
        <div className="h-[360px] pr-2 overflow-y-auto">
          {/* Rotating Specials */}
          {specials.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-[0.2em]">
                Weekly Specials
              </h4>
              <div className="space-y-3">
                {specials.map((item) => {
                  const meta = prepMeta.get(item.mealId);
                  return (
                  <div
                    key={item.mealId}
                    className="rounded-lg border bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.mealName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {meta?.boosts ? (
                            <Badge variant="secondary">Boost x{meta.boosts}</Badge>
                          ) : null}
                          {meta?.subs ? (
                            <Badge variant="outline">Subs x{meta.subs}</Badge>
                          ) : null}
                          {meta?.mods ? (
                            <Badge variant="outline">Mods x{meta.mods}</Badge>
                          ) : null}
                          {meta?.notes ? (
                            <Badge variant="destructive">Notes x{meta.notes}</Badge>
                          ) : null}
                          {!meta?.boosts && !meta?.subs && !meta?.mods && !meta?.notes ? (
                            <span className="text-xs text-muted-foreground">
                              Standard prep
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background text-lg font-semibold text-foreground">
                        {item.count}
                      </span>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {specials.length > 0 && signatures.length > 0 && (
            <Separator className="my-4" />
          )}

          {/* Signatures */}
          {signatures.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-[0.2em]">
                Signatures
              </h4>
              <div className="space-y-3">
                {signatures.map((item) => {
                  const meta = prepMeta.get(item.mealId);
                  return (
                  <div
                    key={item.mealId}
                    className="rounded-lg border bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.mealName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {meta?.boosts ? (
                            <Badge variant="secondary">Boost x{meta.boosts}</Badge>
                          ) : null}
                          {meta?.subs ? (
                            <Badge variant="outline">Subs x{meta.subs}</Badge>
                          ) : null}
                          {meta?.mods ? (
                            <Badge variant="outline">Mods x{meta.mods}</Badge>
                          ) : null}
                          {meta?.notes ? (
                            <Badge variant="destructive">Notes x{meta.notes}</Badge>
                          ) : null}
                          {!meta?.boosts && !meta?.subs && !meta?.mods && !meta?.notes ? (
                            <span className="text-xs text-muted-foreground">
                              Standard prep
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background text-lg font-semibold text-foreground">
                        {item.count}
                      </span>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}

          {summary.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No orders for this week yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
