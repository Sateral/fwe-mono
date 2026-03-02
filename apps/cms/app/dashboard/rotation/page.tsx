import { Badge } from "@/components/ui/badge";
import {
  getRotations,
  getRotatingMeals,
  checkNextWeekWarning,
} from "@/lib/actions/weekly-rotation.actions";
import { RotationManager } from "./_components/rotation-manager";

export default async function RotationPage() {
  const [rotations, rotatingMeals, nextWeekWarning] = await Promise.all([
    getRotations(),
    getRotatingMeals(),
    checkNextWeekWarning(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Rotation
            <Badge variant="secondary">Planning</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Weekly Rotation
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage weekly meal rotations and publish customer-facing menus.
          </p>
        </div>
      </div>
      <RotationManager
        initialRotations={rotations}
        rotatingMeals={rotatingMeals}
        nextWeekWarning={nextWeekWarning}
      />
    </div>
  );
}
