"use client";

import { useMemo, useState } from "react";
import MealCard from "./meal-card";
import MealDetailModal from "./meal-detail-modal";
import type { Meal } from "@/types";

interface MealGridProps {
  meals: Meal[];
  rotatingMealIds?: string[];
}

const MealGrid = ({ meals, rotatingMealIds }: MealGridProps) => {
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const rotatingMealIdSet = useMemo(
    () => new Set(rotatingMealIds ?? []),
    [rotatingMealIds],
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            isRotating={rotatingMealIdSet.has(meal.id)}
            onClick={() => setSelectedMeal(meal)}
          />
        ))}
      </div>

      <MealDetailModal
        meal={selectedMeal}
        isOpen={!!selectedMeal}
        onClose={() => setSelectedMeal(null)}
      />
    </>
  );
};

export default MealGrid;
