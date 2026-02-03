"use server";

import { mealService } from "@/lib/services/meal.service";
import { mealSchema, MealFormValues } from "@/lib/schemas/meal.schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Helper to check if user is admin
async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  return session;
}

// ============ MEALS ============

export async function getMeals() {
  return await mealService.getMeals();
}

export async function getMeal(id: string) {
  return await mealService.getMealById(id);
}

export async function createMeal(data: MealFormValues) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const parsed = mealSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Validation failed:", parsed.error.flatten());
    return { success: false, error: "Invalid meal data" };
  }

  try {
    await mealService.createMeal(parsed.data);
    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("Failed to create meal:", error);
    return { success: false, error: "Failed to create meal" };
  }
}

export async function updateMeal(id: string, data: MealFormValues) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const parsed = mealSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Validation failed:", parsed.error.flatten());
    return { success: false, error: "Invalid meal data" };
  }

  try {
    await mealService.updateMeal(id, parsed.data);
    revalidatePath("/dashboard/menu");
    revalidatePath(`/dashboard/menu/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update meal:", error);
    return { success: false, error: "Failed to update meal" };
  }
}

export async function deleteMeal(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  try {
    await mealService.deleteMeal(id);
    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete meal:", error);
    return { success: false, error: "Failed to delete meal" };
  }
}

// ============ TAGS ============

export async function getTags() {
  return await mealService.getTags();
}

export async function deleteTag(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  try {
    await mealService.deleteTag(id);
    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}
