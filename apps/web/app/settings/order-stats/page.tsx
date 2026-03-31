import { format } from "date-fns";
import {
  CalendarDays,
  CreditCard,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth-server";
import { cmsApi } from "@/lib/cms-api";
import { getUserOrders } from "@/lib/order-service";

export default async function OrderStatsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await cmsApi.users.getById(session.user.id);
  const orders = await getUserOrders(session.user.id).catch(() => []);
  const mealPlanUsage = user?.mealPlan
    ? await cmsApi.mealPlans.getUsage(user.mealPlan.id)
    : null;
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const deliveryCount = orders.filter(
    (order) => order.deliveryMethod === "DELIVERY",
  ).length;
  const pickupCount = orders.filter(
    (order) => order.deliveryMethod === "PICKUP",
  ).length;
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);
  const lastOrderDate =
    recentOrders[0]?.createdAt &&
    format(new Date(recentOrders[0].createdAt), "MMM d, yyyy");

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted pt-20 sm:pt-24 pb-12">
      <Container>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                Order Stats
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                A snapshot of your recent orders and delivery preferences.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 self-start sm:self-auto"
            >
              Back to profile
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl sm:text-3xl font-semibold">
                {totalOrders}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Total Spent
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl sm:text-3xl font-semibold">
                ${totalSpent.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Avg Order
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl sm:text-3xl font-semibold">
                ${averageOrder.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Last Order
                </CardTitle>
              </CardHeader>
              <CardContent className="text-lg sm:text-xl font-semibold">
                {lastOrderDate ?? "No orders yet"}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No orders yet. Check back after your next meal plan.
                  </p>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3"
                    >
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <div className="font-medium text-foreground text-sm truncate">
                          {order.meal?.name ?? "Meal order"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="text-sm font-semibold ml-3">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              {/* Delivery Split */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Delivery Split
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Delivery orders
                    </span>
                    <span className="font-semibold">{deliveryCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pickup orders</span>
                    <span className="font-semibold">{pickupCount}</span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3 text-xs text-muted-foreground">
                    Totals are calculated across your full order history.
                  </div>
                </CardContent>
              </Card>

              {/* Meal Plan Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Meal Plan Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 text-sm">
                  {mealPlanUsage ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Weekly cap
                        </span>
                        <span className="font-semibold">
                          {mealPlanUsage.weeklyCreditCap}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Credits used
                        </span>
                        <span className="font-semibold">
                          {mealPlanUsage.creditsUsed}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Week remaining
                        </span>
                        <span className="font-semibold">
                          {mealPlanUsage.currentWeekCreditsRemaining}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-semibold">
                          {mealPlanUsage.remainingCredits}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-border/60 bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3 text-xs text-muted-foreground">
                      No active meal plan usage yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
