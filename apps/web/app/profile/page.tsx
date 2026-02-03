import { format } from "date-fns";
import { CalendarDays, Mail, MapPin, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
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
  const memberSince =
    "createdAt" in session.user && session.user.createdAt
      ? format(new Date(session.user.createdAt), "MMM yyyy")
      : "N/A";
  const avatarUrl =
    user?.image ?? session.user.image ?? "/images/self-portrait.jpg";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="items-center text-center">
              <div className="h-28 w-28 overflow-hidden rounded-full border border-border/60 bg-muted shadow-sm">
                <img
                  src={avatarUrl}
                  alt={session.user.name ?? "User avatar"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl">
                  {user?.name ?? session.user.name ?? "Your Profile"}
                </CardTitle>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Member since {memberSince}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>{session.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  {user?.deliveryCity
                    ? `${user.deliveryCity}`
                    : "Add your delivery location"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total orders</span>
                <span className="font-semibold">{totalOrders}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total spent</span>
                <span className="font-semibold">${totalSpent.toFixed(2)}</span>
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
        </div>

        <ProfileSetupForm
          defaultValues={{
            name: user?.name ?? session.user.name ?? "",
            phone: user?.phone ?? "",
            deliveryAddress: user?.deliveryAddress ?? "",
            deliveryCity: user?.deliveryCity ?? "",
            deliveryPostal: user?.deliveryPostal ?? "",
            deliveryNotes: user?.deliveryNotes ?? "",
          }}
          submitLabel="Save Changes"
          successMessage="Profile updated!"
          onSuccessRedirect={null}
        />
      </div>
    </main>
  );
}
