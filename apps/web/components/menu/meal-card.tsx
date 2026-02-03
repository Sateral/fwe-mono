"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Flame, Sparkles } from "lucide-react";
import type { Meal } from "@/types";

interface MealCardProps {
  meal: Meal;
  isRotating?: boolean;
  onClick: () => void;
}

const MealCard = ({ meal, isRotating = false, onClick }: MealCardProps) => {
  const price = meal.price;
  const calories = meal.calories;

  return (
    <Card
      onClick={onClick}
      className="overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 group bg-white rounded-3xl p-5 cursor-pointer relative"
    >
      {/* Weekly Special Badge */}
      {isRotating && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-purple-600 hover:bg-purple-600 text-white gap-1 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            Weekly Special
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <div className="relative h-full w-full rounded-2xl overflow-hidden bg-gray-100">
          {meal.imageUrl ? (
            <Image
              src={meal.imageUrl}
              alt={meal.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-200">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-0 pt-4">
        {/* Tags and Calories Row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {meal.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium border-0"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </Badge>
          ))}
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <Flame className="w-3.5 h-3.5" />
            <span>{calories} cal</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{meal.name}</h3>

        {/* Price */}
        <div className="mb-3">
          <span className="inline-block bg-emerald-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
            ${price.toFixed(2)}
          </span>
        </div>

        {/* Order Button */}
        <button className="inline-flex items-center text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors group/btn">
          Order
          <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover/btn:translate-x-0.5" />
        </button>
      </CardContent>
    </Card>
  );
};

export default MealCard;
