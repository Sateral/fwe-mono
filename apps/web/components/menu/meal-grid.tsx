"use client";

import type { Meal } from "@/types";
import { useState } from "react";

import MealCard from "./meal-card";
import MealDetailModal from "./meal-detail-modal";

interface MealGridProps {
  meals: Meal[];
}

const MealGrid = ({ meals }: MealGridProps) => {
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
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
