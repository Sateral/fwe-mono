"use client";

import * as React from "react";
import { format, isFuture } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedRotation } from "@/lib/context/rotation-context";
import { useRotations } from "@/hooks/use-orders";

export function RotationSelector() {
  const { selectedRotationId, setSelectedRotationId } = useSelectedRotation();
  const { data: rotations = [], isLoading } = useRotations();

  // Determine if a rotation is the current prep week
  const getWeekLabel = (rotation: (typeof rotations)[0]) => {
    const weekStart = new Date(rotation.weekStart);
    const weekEnd = new Date(rotation.weekEnd);
    const now = new Date();

    // If we're currently within this delivery week
    if (now >= weekStart && now <= weekEnd) {
      return "This Week";
    }
    // If the delivery week is in the future
    if (isFuture(weekStart)) {
      return "Upcoming";
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
          Rotation
        </span>
        <Skeleton className="h-9 w-[280px]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
        Rotation
      </span>
      <Select
        value={selectedRotationId || undefined}
        onValueChange={setSelectedRotationId}
      >
        <SelectTrigger className="h-9 w-[280px] text-sm">
          <SelectValue placeholder="Select a delivery week" />
        </SelectTrigger>
        <SelectContent>
          {rotations.map((rotation) => {
            const weekStart = new Date(rotation.weekStart);
            const weekEnd = new Date(rotation.weekEnd);
            const label = getWeekLabel(rotation);

            return (
              <SelectItem key={rotation.id} value={rotation.id}>
                <div className="flex items-center gap-2">
                  <span>
                    {format(weekStart, "MMM d")} -{" "}
                    {format(weekEnd, "MMM d, yyyy")}
                  </span>
                  {label && (
                    <Badge
                      variant={label === "This Week" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {label}
                    </Badge>
                  )}
                  {rotation.status !== "PUBLISHED" && (
                    <Badge variant="outline" className="text-xs">
                      {rotation.status}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
