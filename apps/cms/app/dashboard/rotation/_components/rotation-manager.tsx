"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  addWeeks,
  addDays,
  isSameWeek,
} from "date-fns";
import {
  IconPlus,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconArchive,
  IconListDetails,
  IconDownload,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createRotation,
  updateRotationMeals,
  publishRotation,
  archiveRotation,
  unarchiveRotation,
} from "@/lib/actions/weekly-rotation.actions";
import Link from "next/link";

// Types from server actions
type Rotation = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  orderCutoff: Date;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  meals: { id: string; name: string; imageUrl: string | null }[];
  _count?: { meals: number };
  createdAt: Date;
  updatedAt: Date;
};

type RotatingMeal = {
  id: string;
  name: string;
  imageUrl: string | null;
  tags: { id: string; name: string; color: string }[];
};

interface RotationManagerProps {
  initialRotations: Rotation[];
  rotatingMeals: RotatingMeal[];
  nextWeekWarning: { needsAttention: boolean; message?: string };
}

export function RotationManager({
  initialRotations,
  rotatingMeals,
  nextWeekWarning,
}: RotationManagerProps) {
  const [rotations, setRotations] = React.useState(initialRotations);
  const [selectedRotation, setSelectedRotation] =
    React.useState<Rotation | null>(null);
  const [selectedMealIds, setSelectedMealIds] = React.useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Get current and ordering week starts (Week runs Wed-Tue)
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 3 }); // 3 = Wednesday
  const baseNextWeekStart = addWeeks(currentWeekStart, 1);
  const baseNextWeekCutoff = new Date(addDays(baseNextWeekStart, -1));
  baseNextWeekCutoff.setHours(23, 59, 59, 999);
  const nextWeekStart =
    today > baseNextWeekCutoff ? addWeeks(baseNextWeekStart, 1) : baseNextWeekStart;
  const followingWeekStart = addWeeks(nextWeekStart, 1);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  const followingWeekEnd = addDays(followingWeekStart, 6);

  // Handle creating new rotation
  const handleCreateRotation = async (weekStart: Date) => {
    setCreating(true);
    try {
      const newRotation = await createRotation(weekStart);
      setRotations((prev) => [newRotation as Rotation, ...prev]);
      toast.success("Rotation created");
    } catch (error) {
      toast.error("Failed to create rotation");
    } finally {
      setCreating(false);
    }
  };

  // Handle opening meal selector
  const handleEditMeals = (rotation: Rotation) => {
    setSelectedRotation(rotation);
    setSelectedMealIds(rotation.meals.map((m) => m.id));
    setDialogOpen(true);
  };

  // Handle saving meal selection
  const handleSaveMeals = async () => {
    if (!selectedRotation) return;

    try {
      const updated = await updateRotationMeals(
        selectedRotation.id,
        selectedMealIds
      );
      setRotations((prev) =>
        prev.map((r) => (r.id === updated.id ? (updated as Rotation) : r))
      );
      setDialogOpen(false);
      toast.success("Meals updated");
    } catch (error) {
      toast.error("Failed to update meals");
    }
  };

  // Handle publishing rotation
  const handlePublish = async (rotationId: string) => {
    try {
      const updated = await publishRotation(rotationId);
      setRotations((prev) =>
        prev.map((r) => (r.id === updated.id ? (updated as Rotation) : r))
      );
      toast.success("Rotation published - now visible to customers");
    } catch (error) {
      toast.error("Failed to publish rotation");
    }
  };

  // Handle archiving rotation
  const handleArchive = async (rotationId: string) => {
    try {
      await archiveRotation(rotationId);
      setRotations((prev) =>
        prev.map((r) =>
          r.id === rotationId ? { ...r, status: "ARCHIVED" as const } : r
        )
      );
      toast.success("Rotation archived");
    } catch (error) {
      toast.error("Failed to archive rotation");
    }
  };

  // Handle unarchiving rotation
  const handleUnarchive = async (rotationId: string) => {
    try {
      const updated = await unarchiveRotation(rotationId);
      setRotations((prev) =>
        prev.map((r) => (r.id === updated.id ? (updated as Rotation) : r))
      );
      toast.success("Rotation unarchived - now visible to customers");
    } catch (error) {
      toast.error("Failed to unarchive rotation");
    }
  };

  // Check if a week has a rotation
  const getRotationForWeek = (weekStart: Date) => {
    return rotations.find((r) =>
      isSameWeek(new Date(r.weekStart), weekStart, { weekStartsOn: 3 })
    );
  };

  const currentRotation = getRotationForWeek(currentWeekStart);
  const nextRotation = getRotationForWeek(nextWeekStart);
  const followingRotation = getRotationForWeek(followingWeekStart);

  const getStatusBadge = (status: Rotation["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <IconClock className="h-3 w-3 mr-1" /> Draft
          </Badge>
        );
      case "PUBLISHED":
        return (
          <Badge variant="default" className="bg-green-600">
            <IconCheck className="h-3 w-3 mr-1" /> Published
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="outline">
            <IconArchive className="h-3 w-3 mr-1" /> Archived
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      {nextWeekWarning.needsAttention && (
        <Alert variant="destructive">
          <IconAlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>{nextWeekWarning.message}</AlertDescription>
        </Alert>
      )}

      {/* Quick Week Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* This Week's Delivery - Orders were placed LAST week */}
        <Card className="h-full border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">This Week&apos;s Delivery</CardTitle>
              <Badge variant="default" className="bg-green-600">
                Prep Now
              </Badge>
              <Badge variant="outline">Locked</Badge>
            </div>
            <CardDescription>
              {format(currentWeekStart, "MMM d")} -{" "}
              {format(currentWeekEnd, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Orders for this week were collected last week. Rotations are locked
              for fulfillment.
            </p>
            {currentRotation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(currentRotation.status)}
                  <span className="text-sm text-muted-foreground">
                    {currentRotation._count?.meals ??
                      currentRotation.meals.length}{" "}
                    meals
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/dashboard/orders?rotationId=${currentRotation.id}`}
                    >
                      <IconListDetails className="h-4 w-4 mr-2" />
                      View Prep List
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={`/api/reports/prep-sheet?rotationId=${currentRotation.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconDownload className="h-4 w-4 mr-2" />
                      Download Orders
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No rotation record for this delivery week. Prep is still
                  available from the orders dashboard.
                </p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/orders">
                    <IconListDetails className="h-4 w-4 mr-2" />
                    View Orders Dashboard
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ordering Window - Live menu for customers */}
        <Card className="h-full border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Next Week&apos;s Delivery</CardTitle>
              <Badge variant="secondary">Collecting Orders</Badge>
              <Badge variant="outline">Live Menu</Badge>
            </div>
            <CardDescription>
              {format(nextWeekStart, "MMM d")} -{" "}
              {format(nextWeekEnd, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Orders close:{" "}
              <span className="font-medium text-foreground">
                {format(addDays(nextWeekStart, -1), "EEE, MMM d")} at 11:59 PM
              </span>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Changes here update the customer menu immediately.
            </p>
            {nextRotation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(nextRotation.status)}
                  <span className="text-sm text-muted-foreground">
                    {nextRotation._count?.meals ?? nextRotation.meals.length}{" "}
                    meals
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditMeals(nextRotation)}
                  >
                    Edit Rotating Meals
                  </Button>
                  {nextRotation.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(nextRotation.id)}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No rotation published yet. Customers can still order signature
                  meals while rotating items are pending.
                </p>
                <Button
                  onClick={() => handleCreateRotation(nextWeekStart)}
                  disabled={creating}
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  Create Rotation
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Signature meals are always available for ordering.
            </p>
          </CardContent>
        </Card>

        {/* Following Week - Planning ahead */}
        <Card className="h-full border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Following Week</CardTitle>
              <Badge variant="secondary">Planning Ahead</Badge>
              <Badge variant="outline">Staged</Badge>
            </div>
            <CardDescription>
              {format(followingWeekStart, "MMM d")} -{" "}
              {format(followingWeekEnd, "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Prepare rotating meals early. This does not affect the live menu
              until the cutoff passes.
            </p>
            {followingRotation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(followingRotation.status)}
                  <span className="text-sm text-muted-foreground">
                    {followingRotation._count?.meals ??
                      followingRotation.meals.length}{" "}
                    meals
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditMeals(followingRotation)}
                  >
                    Edit Rotating Meals
                  </Button>
                  {followingRotation.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(followingRotation.id)}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No rotation created yet for this week.
                </p>
                <Button
                  onClick={() => handleCreateRotation(followingWeekStart)}
                  disabled={creating}
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  Create Rotation
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Signature meals remain available every week.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Rotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Rotations</CardTitle>
          <CardDescription>History of all weekly rotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rotations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No rotations created yet
              </p>
            ) : (
              rotations.map((rotation) => (
                <div
                  key={rotation.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">
                        Delivery:{" "}
                        {format(new Date(rotation.weekStart), "MMM d")} -{" "}
                        {format(new Date(rotation.weekEnd), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Orders close:{" "}
                        {format(
                          new Date(rotation.orderCutoff),
                          "EEE, MMM d 'at' h:mm a"
                        )}
                      </p>
                    </div>
                    {getStatusBadge(rotation.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {rotation._count?.meals ?? rotation.meals.length} meals
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditMeals(rotation)}
                    >
                      Edit
                    </Button>
                    {rotation.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchive(rotation.id)}
                      >
                        Archive
                      </Button>
                    )}
                    {rotation.status === "ARCHIVED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnarchive(rotation.id)}
                      >
                        Unarchive
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meal Selector Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Meals for Rotation</DialogTitle>
            <DialogDescription>
              Choose which rotating meals to include in this week&apos;s
              rotation.
            </DialogDescription>
          </DialogHeader>

          {rotatingMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No rotating meals available.</p>
              <p className="text-sm">
                Create meals with type &quot;ROTATING&quot; in Menu Management
                first.
              </p>
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
                          prev.filter((id) => id !== meal.id)
                        );
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{meal.name}</p>
                    <div className="flex gap-1 mt-1">
                      {meal.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{ borderColor: tag.color, color: tag.color }}
                          className="text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
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
