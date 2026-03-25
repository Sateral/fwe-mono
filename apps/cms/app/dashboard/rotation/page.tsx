import {
  getRotationPeriods,
  getRotatingMeals,
} from "@/lib/actions/weekly-rotation.actions";
import { RotationPeriodManager } from "./_components/rotation-period-manager";

export default async function RotationPage() {
  const [periodData, rotatingMeals] = await Promise.all([
    getRotationPeriods(),
    getRotatingMeals(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Menu
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Meal Rotations
          </h1>
          <p className="text-sm text-muted-foreground">
            Set the menu for the current and next two-week rotation periods
            (Thursday-anchored fulfillment cycles). No publish step: empty
            periods show no meals until you add them.
          </p>
        </div>
      </div>
      <RotationPeriodManager
        initialPeriods={periodData.periods}
        currentPeriodKey={periodData.currentPeriodKey}
        currentWeekStart={periodData.currentWeekStart}
        anchorWeekStart={periodData.anchorWeekStart}
        rotatingMeals={rotatingMeals}
      />
    </div>
  );
}
