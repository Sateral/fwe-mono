import { mealService } from "@/lib/services/meal.service";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TagForm } from "../../_components/tag-form";
import { notFound } from "next/navigation";

interface EditTagPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage(props: EditTagPageProps) {
  const params = await props.params;
  const { id } = params;
  const tag = await mealService.getTagById(id);

  if (!tag) {
    notFound();
  }

  const onSubmit = async (data: any) => {
    "use server";
    await mealService.updateTag(id, data);
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
            <TagForm onSubmit={onSubmit} initialData={tag} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
