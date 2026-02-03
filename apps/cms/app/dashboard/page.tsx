import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  getDashboardMetrics,
  getRevenueChartData,
} from "@/lib/actions/dashboard.actions";

export default async function Page() {
  const metrics = await getDashboardMetrics();
  const revenueChartData = await getRevenueChartData();

  const recentOrdersData = metrics.recentOrders;

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
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                totalRevenue={metrics.totalRevenue}
                activeMealsCount={metrics.activeMealsCount}
                totalOrdersCount={metrics.totalOrdersCount}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={revenueChartData} />
              </div>
              <div className="px-4 lg:px-6">
                <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
                <DataTable data={recentOrdersData} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
