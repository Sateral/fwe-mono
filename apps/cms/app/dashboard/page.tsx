import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardMetrics,
  getRevenueChartData,
} from "@/lib/actions/dashboard.actions";

export default async function Page() {
  const metrics = await getDashboardMetrics();
  const revenueChartData = await getRevenueChartData();

  const recentOrdersData = metrics.recentOrders;

  return (
    <div className="flex flex-col gap-6 p-6 pt-4">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Dashboard
            <Badge variant="secondary">Overview</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Business Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue trends, current menu health, and recent order activity.
          </p>
        </div>
      </div>

      <SectionCards
        totalRevenue={metrics.totalRevenue}
        activeMealsCount={metrics.activeMealsCount}
        totalOrdersCount={metrics.totalOrdersCount}
      />
      <ChartAreaInteractive data={revenueChartData} />
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recent Orders
        </h2>
        <DataTable data={recentOrdersData} />
      </div>
    </div>
  );
}
