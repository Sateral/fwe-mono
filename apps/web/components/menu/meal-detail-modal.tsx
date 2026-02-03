"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X,
  ShoppingCart,
  Info,
  ChefHat,
  Clock,
  Flame,
  Dumbbell,
} from "lucide-react";
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
    [onClose]
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Image Section */}
            <div className="relative w-full md:w-1/2 h-64 md:h-auto md:min-h-[400px]">
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
                    className="w-24 h-24 text-gray-400"
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
            <div className="w-full md:w-1/2 p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {meal.name}
                </h2>
                <span className="shrink-0 bg-emerald-600 text-white text-lg font-bold px-4 py-1.5 rounded-full">
                  ${price.toFixed(2)}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-emerald-600" />
                  <span>{protein}g protein</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>{calories} cal</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {meal.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-xs font-medium border-0"
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
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {meal.description ||
                  "A delicious, chef-prepared meal made with fresh ingredients."}
              </p>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <ChefHat className="w-4 h-4" />
                    <span>Chef&apos;s notes</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    Balanced flavors and textures with a focus on fresh,
                    seasonal ingredients.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Prep time</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    Ready in 10-15 minutes after delivery.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 rounded-full"
                  asChild
                >
                  <a href={`/order/${meal.slug}`}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Order Now
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="py-6 px-6 rounded-full border-gray-300"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Nutrition
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
