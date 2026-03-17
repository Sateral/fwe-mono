import Container from "@/components/container";
import MealGrid from "@/components/menu/meal-grid";
import { Badge } from "@/components/ui/badge";
import { getAvailableMeals } from "@/actions/meal-services";
import { format } from "date-fns";
import { Clock, Truck, Utensils } from "lucide-react";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata = {
  title: "Menu | Free Will Eats",
  description: "Browse this week's chef-prepared meal lineup",
};

export default async function MenuPage() {
  const { meals, cutoffTime, deliveryWeekDisplay } = await getAvailableMeals();

  return (
    <div className={`${plusJakartaSans.className} bg-background pt-24`}>
      <main>
        {/* Hero Section */}
        <section className="py-12">
          <Container>
            <div className="flex flex-col items-start space-y-4 mb-8">
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-sm font-normal rounded-full gap-2 bg-primary/10 hover:bg-primary/10 text-primary border-0"
              >
                <Utensils className="w-4 h-4" />
                Menu
              </Badge>

              <div className="space-y-3 max-w-2xl">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                  Weekly Menu
                </h1>
                <p className="text-lg text-gray-500">
                  Fresh, chef-prepared meals delivered to your door for the next
                  delivery window.
                </p>
              </div>
            </div>

            {/* Delivery Info Banner */}
            <div className="mb-8 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Truck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Ordering for {deliveryWeekDisplay || "next week"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Orders placed now will be prepared and delivered next week
                    </p>
                  </div>
                </div>
                {cutoffTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full">
                    <Clock className="w-4 h-4" />
                    <span>
                      Order by{" "}
                      {format(new Date(cutoffTime), "EEE, MMM d 'at' h:mm a")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Meals Grid */}
            <MealGrid meals={meals} />
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-20 mb-12 border-y border-black/30 bg-white">
          <Container>
            <div className="text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                Cooked Fresh. Packed with flavor.
              </h2>
              <p className="text-gray-500">
                Order your next favourite meal, today.
              </p>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
