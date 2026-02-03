import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RotationProvider } from "@/lib/context/rotation-context";
import { OrdersDashboard } from "./_components/orders-dashboard";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

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
        <Suspense fallback={<OrdersDashboardSkeleton />}>
          <RotationProvider initialRotationId={resolvedParams.rotationId}>
            <OrdersDashboard />
          </RotationProvider>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function OrdersDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 pt-0 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-10 w-80 bg-muted rounded" />
      </div>
      <div className="h-24 bg-muted rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-80 bg-muted rounded" />
        <div className="md:col-span-2 h-96 bg-muted rounded" />
      </div>
    </div>
  );
}
