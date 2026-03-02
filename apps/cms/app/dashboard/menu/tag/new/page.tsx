import { mealService } from "@/lib/services/meal.service";
import { TagForm } from "../../_components/tag-form";

export default async function NewTagPage() {
  const tags = await mealService.getTags();

  const onSubmit = async (data: any) => {
    "use server";
    await mealService.createTag(data);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
      <div className="mx-auto w-full max-w-5xl">
        <TagForm onSubmit={onSubmit} />
      </div>
    </div>
  );
}
