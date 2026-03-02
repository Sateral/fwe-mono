import { Badge } from "@/components/ui/badge";
import MenuTable from "./_components/menu-table";
import TagTable from "./_components/tag-table";

export default async function MenuPage() {
  return (
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
  );
}
