"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useProductionSummary } from "@/hooks/use-orders";

export function ProductionSummary() {
  const { selectedRotationId } = useSelectedRotation();
  const { data: summary = [], isLoading } =
    useProductionSummary(selectedRotationId);

  const totalMeals = summary.reduce((acc, item) => acc + item.count, 0);

  // Group by type
  const specials = summary.filter((i) => i.isRotating);
  const signatures = summary.filter((i) => !i.isRotating);

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
          <CardTitle className="text-lg">Prep List</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {totalMeals} Total Meals
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] pr-4 overflow-y-auto">
          {/* Rotating Specials */}
          {specials.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Weekly Specials
              </h4>
              <div className="space-y-3">
                {specials.map((item) => (
                  <div
                    key={item.mealId}
                    className="flex items-center justify-between"
                  >
                    <span className="font-medium">{item.mealName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md min-w-[2.5rem] text-center border border-purple-100">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {specials.length > 0 && signatures.length > 0 && (
            <Separator className="my-4" />
          )}

          {/* Signatures */}
          {signatures.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Signatures
              </h4>
              <div className="space-y-3">
                {signatures.map((item) => (
                  <div
                    key={item.mealId}
                    className="flex items-center justify-between"
                  >
                    <span>{item.mealName}</span>
                    <span className="font-bold text-lg bg-gray-50 text-gray-700 px-2 py-0.5 rounded-md min-w-[2.5rem] text-center border">
                      {item.count}
                    </span>
                  </div>
                ))}
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
