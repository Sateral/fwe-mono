import type { MealFormValues } from "@fwe/validators";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createMeal, getTags } from "@/lib/actions/meal.actions";
import { MealForm } from "../_components/meal-form";

export default async function NewMealPage() {
  const tags = await getTags();

  const onSubmit = async (data: MealFormValues) => {
    "use server";
    const result = await createMeal(data);
    if (!result.success) {
      throw new Error(result.error || "Failed to create meal");
    }
  };

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
        <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
          <div className="mx-auto w-full max-w-5xl">
            <MealForm tags={tags} onSubmit={onSubmit} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
