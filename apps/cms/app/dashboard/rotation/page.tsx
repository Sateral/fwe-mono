import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Weekly Rotation
              </h1>
              <p className="text-muted-foreground">
                Manage weekly meal rotations for customers
              </p>
            </div>
          </div>
          <RotationManager
            initialRotations={rotations}
            rotatingMeals={rotatingMeals}
            nextWeekWarning={nextWeekWarning}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
