import Image from "next/image";
import Link from "next/link";
import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ChevronRight } from "lucide-react";
import { getFeaturedMeals } from "@/actions/meal-services";
import type { ApiMeal } from "@fwe/types";

const FeaturedMenu = async () => {
  const featuredMeals = await getFeaturedMeals();
  const mealsToShow = featuredMeals.slice(0, 3);

  return (
    <section className="bg-gray-50/50 py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12">
          <Badge
            variant="secondary"
            className="px-3 py-1 text-xs sm:text-sm font-normal rounded-full gap-2 bg-gray-200 hover:bg-gray-200 text-gray-700 border-0"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Meals
          </Badge>

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              Featured Menu Selection
            </h2>
            <p className="text-base sm:text-lg text-gray-500">
              Discover the most popular and delicious chef-prepared meals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {mealsToShow.map((meal) => (
            <MenuCard key={meal.id} meal={meal} />
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            className="rounded-full h-10 sm:h-12 text-sm sm:text-base group"
            asChild
          >
            <Link href="/menu">
              <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 px-1">
                View More
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
};

const MenuCard = ({ meal }: { meal: ApiMeal }) => (
  <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white rounded-2xl sm:rounded-4xl p-4 sm:p-6">
    <div className="relative h-48 sm:h-64 w-full overflow-hidden">
      <div className="relative h-full w-full rounded-xl sm:rounded-3xl overflow-hidden">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No image</span>
          </div>
        )}
      </div>
    </div>
    <CardContent className="p-0 pt-3 sm:pt-0">
      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
          {meal.name}
        </h3>
        <span className="text-base sm:text-lg font-semibold text-gray-900">
          ${meal.price.toFixed(2)}
        </span>
      </div>

      <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2">
        {meal.description || "Delicious chef-prepared meal"}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {meal.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full gap-1 sm:gap-1.5 font-normal text-xs"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>

        <Link
          href={`/order/${meal.slug}`}
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          Order
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
        </Link>
      </div>
    </CardContent>
  </Card>
);

export default FeaturedMenu;
