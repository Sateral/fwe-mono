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
    <div
      className={`${plusJakartaSans.className} bg-background pt-20 sm:pt-24`}
    >
      <main>
        {/* Hero Section */}
        <section className="py-8 sm:py-12">
          <Container>
            <div className="flex flex-col items-start space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <Badge
                variant="secondary"
                className="px-3 py-1 text-xs sm:text-sm font-normal rounded-full gap-2 bg-primary/10 hover:bg-primary/10 text-primary border-0"
              >
                <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Menu
              </Badge>

              <div className="space-y-2 sm:space-y-3 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                  Weekly Menu
                </h1>
                <p className="text-base sm:text-lg text-gray-500">
                  Fresh, chef-prepared meals delivered to your door for the next
                  delivery window.
                </p>
              </div>
            </div>

            {/* Delivery Info Banner */}
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gray-200 rounded-lg sm:rounded-xl">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                      Ordering for {deliveryWeekDisplay || "next week"}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Orders placed now will be delivered next week
                    </p>
                  </div>
                </div>
                {cutoffTime && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-gray-200">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
        <section className="py-12 sm:py-16 lg:py-20 mb-8 sm:mb-12 border-y border-black/30 bg-white">
          <Container>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                Cooked Fresh. Packed with flavor.
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                Order your next favourite meal, today.
              </p>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
