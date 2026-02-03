import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mealService } from "@/lib/services/meal.service";
import { requireInternalAuth } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meal = await mealService.getMealById(id);
    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }
    return NextResponse.json(meal);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch meal" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const data = await request.json();
    const meal = await mealService.updateMeal(id, data);
    revalidatePath("/dashboard/menu");
    revalidatePath(`/dashboard/menu/${id}`);
    return NextResponse.json(meal);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update meal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    await mealService.deleteMeal(id);
    revalidatePath("/dashboard/menu");
    return NextResponse.json({ message: "Meal deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
