import type { MealFormValues } from "@fwe/validators";
import { notFound } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getMeal, getTags, updateMeal } from "@/lib/actions/meal.actions";
import { MealForm } from "../_components/meal-form";

interface EditMealPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMealPage(props: EditMealPageProps) {
  const params = await props.params;
  const { id } = params;
  const [meal, tags] = await Promise.all([getMeal(id), getTags()]);

  if (!meal) {
    notFound();
  }

  const onSubmit = async (data: MealFormValues) => {
    "use server";
    const result = await updateMeal(id, data);
    if (!result.success) {
      throw new Error(result.error || "Failed to update meal");
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
            <MealForm initialData={meal} tags={tags} onSubmit={onSubmit} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
