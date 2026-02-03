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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth-server";
import { getUserOrders } from "@/lib/order-service";

export default async function OrderStatsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const orders = await getUserOrders(session.user.id).catch(() => []);
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
    <main className="min-h-screen bg-gradient-to-b from-background to-muted px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Order Stats</h1>
            <p className="text-sm text-muted-foreground">
              A snapshot of your recent orders and delivery preferences.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            Back to profile
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {totalOrders}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              ${totalSpent.toFixed(2)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Package className="h-4 w-4 text-primary" />
                Avg Order
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              ${averageOrder.toFixed(2)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Last Order
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {lastOrderDate ?? "No orders yet"}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No orders yet. Check back after your next meal plan.
                </p>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {order.meal?.name ?? "Meal order"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-primary" />
                Delivery Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery orders</span>
                <span className="font-semibold">{deliveryCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pickup orders</span>
                <span className="font-semibold">{pickupCount}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                Totals are calculated across your full order history.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
