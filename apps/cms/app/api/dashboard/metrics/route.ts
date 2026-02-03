import { NextRequest, NextResponse } from "next/server";
import { dashboardService } from "@/lib/services/dashboard.service";
import { requireInternalAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  // Require authentication for dashboard access
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const metrics = await dashboardService.getMetrics();
    const chartData = await dashboardService.getRevenueChartData();
    return NextResponse.json({ ...metrics, revenueChartData: chartData });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
