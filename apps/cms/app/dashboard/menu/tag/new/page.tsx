import { mealService } from "@/lib/services/meal.service";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TagForm } from "../../_components/tag-form";

export default async function NewTagPage() {
  const tags = await mealService.getTags();

  const onSubmit = async (data: any) => {
    "use server";
    await mealService.createTag(data);
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
            <TagForm onSubmit={onSubmit} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
