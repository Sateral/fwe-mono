import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MealForm } from "../_components/meal-form";
import { getTags, createMeal } from "@/lib/actions/meal.actions";
import { MealFormValues } from "@/lib/schemas/meal.schema";

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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="max-w-4xl mx-auto w-full py-6">
            <MealForm tags={tags} onSubmit={onSubmit} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
