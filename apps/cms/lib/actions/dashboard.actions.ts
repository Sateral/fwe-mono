"use server";

import { dashboardService } from "@/lib/services/dashboard.service";

export async function getDashboardMetrics() {
  return await dashboardService.getMetrics();
}

export async function getRevenueChartData() {
  return await dashboardService.getRevenueChartData();
}
