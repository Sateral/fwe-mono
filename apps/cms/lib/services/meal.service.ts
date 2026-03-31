import { DietaryTag, Meal } from "@fwe/db";
import type { MealFormValues, TagFormValues } from "@fwe/validators";

import prisma from "@/lib/prisma";

export const mealService = {
  // MEALS
  async getMeals() {
    return await prisma.meal.findMany({
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  async getMealById(id: string) {
    return await prisma.meal.findUnique({
      where: { id },
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
    });
  },

  /**
   * Retrieves a meal by its unique slug.
   * Used by commerce app for meal detail pages.
   */
  async getMealBySlug(slug: string) {
    return await prisma.meal.findUnique({
      where: { slug },
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
    });
  },

  /**
   * Retrieves all featured meals.
   * Used by commerce app for homepage display.
   */
  async getFeaturedMeals() {
    return await prisma.meal.findMany({
      where: { isFeatured: true },
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  /**
   * Retrieves all meals with a specific tag.
   * Used by commerce app for tag filtering.
   */
  async getMealsByTag(tagName: string) {
    return await prisma.meal.findMany({
      where: {
        tags: {
          some: { name: tagName },
        },
      },
      include: {
        substitutionGroups: {
          include: {
            options: true,
          },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  async createMeal(data: MealFormValues): Promise<Meal> {
    const { tags, substitutionGroups, modifierGroups, ...mealData } = data;

    return await prisma.meal.create({
      data: {
        ...mealData,
        substitutionGroups: {
          create: substitutionGroups.map((group) => ({
            name: group.name,
            options: {
              create: group.options,
            },
          })),
        },
        modifierGroups: {
          create: modifierGroups.map((group) => ({
            ...group,
            options: {
              create: group.options,
            },
          })),
        },
        tags: {
          connect: tags.map((tag) => ({ id: tag.id })),
        },
      },
    });
  },

  async updateMeal(id: string, data: MealFormValues): Promise<Meal> {
    const { tags, substitutionGroups, modifierGroups, ...mealData } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Update basic info and tags
      await tx.meal.update({
        where: { id },
        data: {
          ...mealData,
          tags: {
            set: [], // Clear tags
            connect: tags.map((tag) => ({ id: tag.id })),
          },
        },
      });

      // 2. Delete existing groups and recreate
      await tx.substitutionGroup.deleteMany({ where: { mealId: id } });
      await tx.modifierGroup.deleteMany({ where: { mealId: id } });

      return await tx.meal.update({
        where: { id },
        data: {
          substitutionGroups: {
            create: substitutionGroups.map((group) => ({
              name: group.name,
              options: {
                create: group.options,
              },
            })),
          },
          modifierGroups: {
            create: modifierGroups.map((group) => ({
              ...group,
              options: {
                create: group.options,
              },
            })),
          },
        },
      });
    });
  },

  async deleteMeal(id: string) {
    return await prisma.meal.delete({
      where: { id },
    });
  },

  // TAGS
  async getTags(): Promise<DietaryTag[]> {
    return await prisma.dietaryTag.findMany();
  },

  async getTagById(id: string): Promise<DietaryTag | null> {
    return await prisma.dietaryTag.findUnique({ where: { id } });
  },

  async createTag(data: TagFormValues): Promise<DietaryTag> {
    return await prisma.dietaryTag.create({ data });
  },

  async updateTag(id: string, data: TagFormValues): Promise<DietaryTag> {
    return await prisma.dietaryTag.update({ where: { id }, data });
  },

  async deleteTag(id: string): Promise<DietaryTag> {
    return await prisma.dietaryTag.delete({ where: { id } });
  },
};
