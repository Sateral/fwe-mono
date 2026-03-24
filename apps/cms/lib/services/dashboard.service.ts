import prisma from "@/lib/prisma";
import { toPlainObject } from "@/lib/utils";

export const dashboardService = {
  async getMetrics() {
    const [totalRevenueAgg, activeMealsCount, totalOrdersCount, recentOrders] =
      await Promise.all([
        prisma.order.aggregate({
          _sum: {
            totalAmount: true,
          },
          where: {
            paymentStatus: "PAID",
          },
        }),
        prisma.meal.count({
          where: {
            isActive: true,
          },
        }),
        prisma.order.count(),
        prisma.order.findMany({
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: true,
          },
        }),
      ]);

    const totalRevenue = totalRevenueAgg._sum?.totalAmount ?? 0;

    return toPlainObject({
      totalRevenue: Number(totalRevenue),
      activeMealsCount,
      totalOrdersCount,
      recentOrders,
    });
  },

  async getRevenueChartData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use raw query for better performance with aggregation
    const result = await prisma.$queryRaw<{ date: Date; revenue: number }[]>`
      SELECT
        DATE("createdAt") as date,
        SUM("totalAmount") as revenue
      FROM "Order"
      WHERE "paymentStatus" = 'PAID' AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Format for the chart
    return result.map((item) => ({
      date: new Date(item.date).toISOString().split("T")[0] ?? "",
      revenue: Number(item.revenue),
    }));
  },
};
