import { format } from "date-fns";
import { CalendarDays, Mail, MapPin, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import Container from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "@/lib/auth-server";
import { cmsApi } from "@/lib/cms-api";
import { getUserOrders } from "@/lib/order-service";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await cmsApi.users.getById(session.user.id);
  const orders = await getUserOrders(session.user.id).catch(() => []);
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const lastOrder = orders.reduce<null | (typeof orders)[number]>(
    (latest, order) => {
      if (!latest) return order;
      return new Date(order.createdAt) > new Date(latest.createdAt)
        ? order
        : latest;
    },
    null,
  );
  const lastOrderDate = lastOrder
    ? format(new Date(lastOrder.createdAt), "MMM d, yyyy")
    : "No orders yet";
  const assignedMeals = orders.filter((order) => order.assignedByChef);
  const memberSince =
    "createdAt" in session.user && session.user.createdAt
      ? format(new Date(session.user.createdAt), "MMM yyyy")
      : "N/A";
  const avatarUrl =
    user?.image ?? session.user.image ?? "/images/self-portrait.jpg";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted pt-20 sm:pt-24 pb-12">
      <Container>
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[320px_1fr] lg:items-start">
          {/* Left Sidebar */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="space-y-1 pt-2">
                  <CardTitle className="text-xl sm:text-2xl">
                    {user?.name ?? session.user.name ?? "Your Profile"}
                  </CardTitle>
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Member since {memberSince}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 sm:space-y-3 text-sm text-muted-foreground pt-0">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{session.user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {user?.deliveryCity
                      ? `${user.deliveryCity}`
                      : "Add your delivery location"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary Card */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total orders</span>
                  <span className="font-semibold">{totalOrders}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total spent</span>
                  <span className="font-semibold">
                    ${totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last order</span>
                  <span className="font-semibold">{lastOrderDate}</span>
                </div>
                <Link
                  href="/settings/order-stats"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Package className="h-4 w-4" />
                  View full stats
                </Link>
              </CardContent>
            </Card>

            {/* Meal Plan Card - temporarily hidden */}
            {/* <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Meal Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 text-sm">
                {user?.mealPlan ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Remaining credits
                      </span>
                      <span className="font-semibold">
                        {user.mealPlan.remainingCredits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Weekly cap</span>
                      <span className="font-semibold">
                        {user.mealPlan.weeklyCreditCap}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        This week used
                      </span>
                      <span className="font-semibold">
                        {user.mealPlan.currentWeekCreditsUsed}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No meal plan yet. Credits and weekly redemption limits will
                    show here.
                  </p>
                )}
              </CardContent>
            </Card> */}

            {/* Chef Assigned Meals Card - temporarily hidden */}
            {/* {user?.flavorProfile?.involvement === "HANDS_OFF" && (
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Chef Assigned Meals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {assignedMeals.length > 0 ? (
                    assignedMeals.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">
                            {order.meal?.name ?? "Assigned meal"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Added{" "}
                            {format(new Date(order.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                        <div className="text-sm font-semibold ml-2">
                          Qty {order.quantity}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      Your chef-assigned meals will appear here after the
                      ordering window closes.
                    </p>
                  )}
                </CardContent>
              </Card>
            )} */}
          </div>

          {/* Right Column - Profile Form */}
          <div className="min-w-0">
            <ProfileSetupForm
              defaultValues={{
                name: user?.name ?? session.user.name ?? "",
                phone: user?.phone ?? "",
                deliveryAddress: user?.deliveryAddress ?? "",
                deliveryCity: user?.deliveryCity ?? "",
                deliveryPostal: user?.deliveryPostal ?? "",
                deliveryNotes: user?.deliveryNotes ?? "",
                flavorProfile: user?.flavorProfile ?? undefined,
              }}
              submitLabel="Save Changes"
              successMessage="Profile updated!"
              onSuccessRedirect={null}
              showFlavorProfileSection={false}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
