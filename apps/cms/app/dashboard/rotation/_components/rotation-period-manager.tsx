"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  IconPlus,
  IconPhoto,
  IconDownload,
  IconListDetails,
} from "@tabler/icons-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createRotationPeriodWithWeeks,
  updateRotationPeriodMeals,
} from "@/lib/actions/weekly-rotation.actions";
import {
  resolveFulfillmentCycleEnd,
  shiftFulfillmentCycle,
} from "@/lib/services/rotation-schedule";
import Link from "next/link";

type RotationStatus = "DRAFT" | "ARCHIVED";

type Meal = {
  id: string;
  name: string;
  imageUrl: string | null;
  tags: { id: string; name: string; color: string }[];
};

type Rotation = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  orderCutoff: Date;
  status: RotationStatus;
};

type RotationPeriod = {
  id: string;
  key: string;
  name: string;
  status: RotationStatus;
  meals: Meal[];
  rotations: Rotation[];
  createdAt: Date;
  updatedAt: Date;
};

interface RotationPeriodManagerProps {
  initialPeriods: RotationPeriod[];
  currentPeriodKey: string;
  currentWeekStart: Date;
  anchorWeekStart: Date;
  rotatingMeals: Meal[];
}

function getPeriodDateRange(period: RotationPeriod): {
  start: Date;
  end: Date;
} {
  if (period.rotations.length === 0) {
    const startDate = new Date(period.key + "T12:00:00");
    const secondCycleStart = shiftFulfillmentCycle(startDate, 1);
    return {
      start: startDate,
      end: resolveFulfillmentCycleEnd(secondCycleStart),
    };
  }

  const sortedRotations = [...period.rotations].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
  );

  const firstRotation = sortedRotations[0];
  const lastRotation = sortedRotations[sortedRotations.length - 1];

  return {
    start: new Date(firstRotation?.weekStart ?? period.key),
    end: new Date(
      lastRotation?.weekEnd ??
        resolveFulfillmentCycleEnd(
          shiftFulfillmentCycle(new Date(period.key + "T12:00:00"), 1),
        ),
    ),
  };
}

function getPeriodWeekNumbers(
  period: RotationPeriod,
  anchorWeekStart: Date,
): { weekNumber1: number; weekNumber2: number } {
  const { start } = getPeriodDateRange(period);
  const diffMs = start.getTime() - new Date(anchorWeekStart).getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const weekNumber1 = Math.max(1, diffWeeks + 1);
  const weekNumber2 = weekNumber1 + 1;

  return { weekNumber1, weekNumber2 };
}

export function RotationPeriodManager({
  initialPeriods,
  currentPeriodKey,
  currentWeekStart,
  anchorWeekStart,
  rotatingMeals,
}: RotationPeriodManagerProps) {
  const [periods, setPeriods] = React.useState(initialPeriods);
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<RotationPeriod | null>(null);
  const [selectedMealIds, setSelectedMealIds] = React.useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Find current and next periods
  const sortedPeriods = [...periods].sort((a, b) => a.key.localeCompare(b.key));
  const currentPeriod = sortedPeriods.find((p) => p.key === currentPeriodKey);
  const currentPeriodIndex = sortedPeriods.findIndex(
    (p) => p.key === currentPeriodKey,
  );
  const nextPeriod =
    currentPeriodIndex >= 0 ? sortedPeriods[currentPeriodIndex + 1] : undefined;

  // Calculate next period start date
  const getFirstStartAfterPeriod = (period: RotationPeriod): Date => {
    const sorted = [...period.rotations].sort(
      (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
    );
    const last = sorted[sorted.length - 1];
    if (!last) {
      return new Date(currentWeekStart);
    }
    return shiftFulfillmentCycle(new Date(last.weekStart), 1);
  };

  const getNextPeriodStartDate = (): Date => {
    if (currentPeriod) {
      return getFirstStartAfterPeriod(currentPeriod);
    }
    return new Date(currentWeekStart);
  };

  const handleCreatePeriod = async () => {
    setCreating(true);
    try {
      // If next period already exists, we're creating the one after that
      // Otherwise create the next period after current
      const startDate = nextPeriod
        ? getFirstStartAfterPeriod(nextPeriod)
        : getNextPeriodStartDate();

      const newPeriod = await createRotationPeriodWithWeeks(startDate);
      if (newPeriod) {
        setPeriods((prev) => [...prev, newPeriod as RotationPeriod]);
        toast.success("Rotation period created for next 2 weeks");
      }
    } catch (error) {
      toast.error("Failed to create rotation period");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCurrentPeriod = async () => {
    setCreating(true);
    try {
      const newPeriod = await createRotationPeriodWithWeeks(
        new Date(currentWeekStart),
      );
      if (newPeriod) {
        setPeriods((prev) => [...prev, newPeriod as RotationPeriod]);
        toast.success("Current rotation period created");
      }
    } catch (error) {
      toast.error("Failed to create rotation period");
    } finally {
      setCreating(false);
    }
  };

  const handleEditMeals = (period: RotationPeriod) => {
    setSelectedPeriod(period);
    setSelectedMealIds(period.meals.map((m) => m.id));
    setDialogOpen(true);
  };

  const handleSaveMeals = async () => {
    if (!selectedPeriod) return;

    try {
      const updated = await updateRotationPeriodMeals(
        selectedPeriod.id,
        selectedMealIds,
      );
      if (updated) {
        setPeriods((prev) =>
          prev.map((p) =>
            p.id === updated.id ? (updated as RotationPeriod) : p,
          ),
        );
      }
      setDialogOpen(false);
      toast.success("Meals updated");
    } catch (error) {
      toast.error("Failed to update meals");
    }
  };

  const renderMealGrid = (meals: Meal[], isPlaceholder: boolean = false) => {
    // Show 8 meals max in 2 rows
    const displayMeals = meals.slice(0, 8);
    const emptySlots = isPlaceholder ? 8 : Math.max(0, 8 - displayMeals.length);

    return (
      <div className="grid grid-cols-4 gap-2">
        {displayMeals.map((meal) => (
          <div key={meal.id} className="flex flex-col">
            <div className="aspect-[4/3] relative rounded-md overflow-hidden bg-muted">
              {meal.imageUrl ? (
                <Image
                  src={meal.imageUrl}
                  alt={meal.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 150px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <IconPhoto className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {meal.name}
            </p>
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="flex flex-col">
            <div className="aspect-[4/3] rounded-md bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <IconPhoto className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1 truncate">
              Future Dish
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderPeriodCard = (
    period: RotationPeriod | undefined,
    isCurrent: boolean,
    weekNumbers?: { weekNumber1: number; weekNumber2: number },
  ) => {
    if (!period) {
      // Empty state card for creating a new period
      return (
        <div
          className={`rounded-xl border-2 border-dashed p-6 ${
            isCurrent
              ? "bg-amber-50/50 border-amber-200"
              : "bg-yellow-50/50 border-yellow-200"
          }`}
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">
                  {isCurrent ? "Current Rotation" : "Next Rotation"}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {isCurrent
                  ? "No rotation period set up for the current 2-week window."
                  : "Set up the next 2-week rotation period ahead of time."}
              </p>
            </div>
            <Button
              onClick={
                isCurrent ? handleCreateCurrentPeriod : handleCreatePeriod
              }
              disabled={creating}
              className="w-full"
            >
              <IconPlus className="h-4 w-4 mr-2" />
              {creating
                ? "Creating..."
                : isCurrent
                  ? "Create Current Period"
                  : "Set Next 2 Weeks"}
            </Button>
          </div>
        </div>
      );
    }

    const { start, end } = getPeriodDateRange(period);
    const displayWeekNumbers =
      weekNumbers ?? getPeriodWeekNumbers(period, anchorWeekStart);
    const isArchived = period.status === "ARCHIVED";
    const hasMeals = period.meals.length > 0;

    // Find rotation IDs for prep list
    const firstRotationId = period.rotations[0]?.id;

    return (
      <div
        className={`rounded-xl border overflow-hidden ${
          isCurrent
            ? "bg-amber-50/80 border-amber-200"
            : "bg-yellow-50/80 border-yellow-200"
        }`}
      >
        <div className="flex">
          {/* Left side - Info */}
          <div className="w-[380px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold">
                  {isCurrent ? "Current" : "Next"} Rotation (Weeks{" "}
                  {displayWeekNumbers.weekNumber1}-
                  {displayWeekNumbers.weekNumber2})
                </h3>
                <Badge
                  variant={isArchived ? "secondary" : "default"}
                  className={
                    isArchived
                      ? "bg-muted text-muted-foreground"
                      : "bg-green-600 hover:bg-green-600"
                  }
                >
                  {isArchived ? "Archived" : hasMeals ? "Menu set" : "Empty"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {isCurrent && hasMeals
                  ? "This period drives the storefront menu for its two fulfillment cycles."
                  : "Add meals so customers see a menu for this period."}
              </p>
              <p className="text-sm font-medium">{period.meals.length} meals</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {isCurrent && hasMeals ? (
                <>
                  <Button
                    className="w-full"
                    variant="default"
                    size="sm"
                    onClick={() => handleEditMeals(period)}
                  >
                    Edit menu
                  </Button>
                  {firstRotationId ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/dashboard/orders?rotationId=${firstRotationId}`}
                        >
                          <IconListDetails className="h-4 w-4 mr-2" />
                          View Prep List
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/api/reports/prep-sheet?rotationId=${firstRotationId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconDownload className="h-4 w-4 mr-2" />
                          Download Orders
                        </a>
                      </Button>
                    </>
                  ) : null}
                </>
              ) : (
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  onClick={() => handleEditMeals(period)}
                >
                  {isCurrent ? "Edit Current" : "Set Next 2 Weeks"}
                </Button>
              )}
            </div>
          </div>

          {/* Right side - Meal grid */}
          <div className="flex-1 p-4 bg-white/50">
            {renderMealGrid(period.meals, !hasMeals)}
          </div>
        </div>
      </div>
    );
  };

  // Calculate week numbers for display
  const currentWeekNumbers = currentPeriod
    ? getPeriodWeekNumbers(currentPeriod, anchorWeekStart)
    : { weekNumber1: 1, weekNumber2: 2 };

  const nextWeekNumbers = nextPeriod
    ? getPeriodWeekNumbers(nextPeriod, anchorWeekStart)
    : {
        weekNumber1: currentWeekNumbers.weekNumber2 + 1,
        weekNumber2: currentWeekNumbers.weekNumber2 + 2,
      };

  return (
    <div className="space-y-6">
      {/* Current Period Card */}
      {renderPeriodCard(currentPeriod, true, currentWeekNumbers)}

      {/* Next Period Card */}
      {renderPeriodCard(nextPeriod, false, nextWeekNumbers)}

      {/* Meal Selector Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Meals for Rotation Period</DialogTitle>
            <DialogDescription>
              Choose meals for this two-cycle rotation period. The same lineup
              applies to both fulfillment cycles in the period.
            </DialogDescription>
          </DialogHeader>

          {rotatingMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active meals in the catalog.</p>
              <p className="text-sm">Create meals under Menu Management first.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {rotatingMeals.map((meal) => (
                <label
                  key={meal.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedMealIds.includes(meal.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMealIds((prev) => [...prev, meal.id]);
                      } else {
                        setSelectedMealIds((prev) =>
                          prev.filter((id) => id !== meal.id),
                        );
                      }
                    }}
                  />
                  <div className="flex items-center gap-3 flex-1">
                    {meal.imageUrl && (
                      <div className="w-12 h-12 relative rounded overflow-hidden">
                        <Image
                          src={meal.imageUrl}
                          alt={meal.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{meal.name}</p>
                      <div className="flex gap-1 mt-1">
                        {meal.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            style={{
                              borderColor: tag.color,
                              color: tag.color,
                            }}
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMeals}>
              Save ({selectedMealIds.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
