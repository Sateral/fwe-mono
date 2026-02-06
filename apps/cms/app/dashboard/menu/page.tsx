import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import MenuTable from "./_components/menu-table";
import TagTable from "./_components/tag-table";

export default async function MenuPage() {
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
        <div className="flex flex-col gap-6 p-6 pt-4">
          <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Menu
                <Badge variant="secondary">CMS</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Menu Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage meals, pricing, and dietary tags shown to customers.
              </p>
            </div>
          </div>
          <MenuTable />
          <TagTable />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
