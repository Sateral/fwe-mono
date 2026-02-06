import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RotationProvider } from "@/lib/context/rotation-context";
import { PrepManifestDashboard } from "../_components/prep-manifest-dashboard";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

export default async function PrepManifestPage({ searchParams }: Props) {
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
        <Suspense fallback={<PrepManifestSkeleton />}>
          <RotationProvider initialRotationId={resolvedParams.rotationId}>
            <PrepManifestDashboard />
          </RotationProvider>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PrepManifestSkeleton() {
  return (
    <div className="animate-pulse p-6 pt-4">
      <div className="h-9 w-64 rounded bg-muted" />
      <div className="mt-4 h-[560px] rounded-lg bg-muted" />
    </div>
  );
}
