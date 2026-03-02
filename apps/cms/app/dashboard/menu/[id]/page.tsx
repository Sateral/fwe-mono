import type { MealFormValues } from "@fwe/validators";
import { notFound } from "next/navigation";

import { getMeal, getTags, updateMeal } from "@/lib/actions/meal.actions";
import { MealForm } from "../_components/meal-form";

interface EditMealPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMealPage(props: EditMealPageProps) {
  const params = await props.params;
  const { id } = params;
  const [meal, tags] = await Promise.all([getMeal(id), getTags()]);

  if (!meal) {
    notFound();
  }

  const onSubmit = async (data: MealFormValues) => {
    "use server";
    const result = await updateMeal(id, data);
    if (!result.success) {
      throw new Error(result.error || "Failed to update meal");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
      <div className="mx-auto w-full max-w-5xl">
        <MealForm initialData={meal} tags={tags} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
