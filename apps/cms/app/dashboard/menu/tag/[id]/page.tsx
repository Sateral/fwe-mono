import { mealService } from "@/lib/services/meal.service";
import { TagForm } from "../../_components/tag-form";
import { notFound } from "next/navigation";

interface EditTagPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage(props: EditTagPageProps) {
  const params = await props.params;
  const { id } = params;
  const tag = await mealService.getTagById(id);

  if (!tag) {
    notFound();
  }

  const onSubmit = async (data: any) => {
    "use server";
    await mealService.updateTag(id, data);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
      <div className="mx-auto w-full max-w-5xl">
        <TagForm onSubmit={onSubmit} initialData={tag} />
      </div>
    </div>
  );
}
