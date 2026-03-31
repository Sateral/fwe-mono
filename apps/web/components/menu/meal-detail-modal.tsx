"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, Flame, Dumbbell } from "lucide-react";
import type { Meal } from "@/types";
import { useEffect, useCallback } from "react";

interface MealDetailModalProps {
  meal: Meal | null;
  isOpen: boolean;
  onClose: () => void;
}

const MealDetailModal = ({ meal, isOpen, onClose }: MealDetailModalProps) => {
  const price = meal?.price ?? 0;
  const calories = meal?.calories ?? 0;
  const protein = meal?.protein ?? 0;

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || !meal) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
        <div
          className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden pointer-events-auto animate-in fade-in duration-200 slide-in-from-bottom-[20%] sm:slide-in-from-bottom-0 sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="flex flex-col md:flex-row max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Image Section */}
            <div className="relative w-full md:w-1/2 h-48 sm:h-64 md:h-auto md:min-h-[400px] shrink-0">
              {meal.imageUrl ? (
                <Image
                  src={meal.imageUrl}
                  alt={meal.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-200">
                  <svg
                    className="w-16 h-16 sm:w-24 sm:h-24 text-gray-400"
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

            {/* Content Section */}
            <div className="w-full md:w-1/2 p-4 sm:p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {meal.name}
                </h2>
                <span className="shrink-0 bg-gray-900 text-white text-base sm:text-lg font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
                  ${price.toFixed(2)}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                  <span>{protein}g protein</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  <span>{calories} cal</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {meal.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border-0"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {/* Description */}
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                {meal.description ||
                  "A delicious, chef-prepared meal made with fresh ingredients."}
              </p>

              {meal.ingredients ? (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 sm:mb-2">
                    Ingredients
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {meal.ingredients}
                  </p>
                </div>
              ) : null}

              <div className="mt-auto pt-2">
                <Button
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-5 sm:py-6 rounded-full text-sm sm:text-base"
                  asChild
                >
                  <a href={`/order/${meal.slug}`}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Order Now
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MealDetailModal;
