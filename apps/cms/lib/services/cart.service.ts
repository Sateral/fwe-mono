import { Prisma } from "@fwe/db";
import type { CreateCartInput, UpdateCartInput } from "@fwe/validators";

import prisma from "@/lib/prisma";
import { calculateMealUnitPrice } from "@fwe/utils/price-utils";

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

const cartInclude = {
  items: {
    include: {
      meal: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          price: true,
          substitutionGroups: { include: { options: true } },
          modifierGroups: { include: { options: true } },
        },
      },
      rotation: true,
    },
  },
};

function toSelectedModifiers(
  modifiers?: Array<{ groupId: string; optionIds: string[] }>,
) {
  const selected: Record<string, string[]> = {};

  for (const modifier of modifiers ?? []) {
    selected[modifier.groupId] = modifier.optionIds;
  }

  return selected;
}

function toSelectedSubstitutions(
  substitutions?: Array<{ groupId: string; optionId: string }>,
) {
  const selected: Record<string, string> = {};

  for (const substitution of substitutions ?? []) {
    selected[substitution.groupId] = substitution.optionId;
  }

  return selected;
}

async function buildCartItemsData(input: CreateCartInput) {
  const meals = await prisma.meal.findMany({
    where: {
      id: {
        in: input.items.map((item) => item.mealId),
      },
    },
    include: {
      substitutionGroups: { include: { options: true } },
      modifierGroups: { include: { options: true } },
    },
  });

  const mealById = new Map(meals.map((meal) => [meal.id, meal]));

  return input.items.map((item) => {
    const meal = mealById.get(item.mealId);
    if (!meal) {
      throw new Error(`Meal ${item.mealId} not found`);
    }

    const unitPrice = calculateMealUnitPrice(
      {
        price: new Prisma.Decimal(meal.price).toNumber(),
        modifierGroups: meal.modifierGroups.map((group) => ({
          id: group.id,
          options: group.options.map((option) => ({
            id: option.id,
            extraPrice: new Prisma.Decimal(option.extraPrice).toNumber(),
          })),
        })),
        substitutionGroups: meal.substitutionGroups.map((group) => ({
          id: group.id,
          options: group.options.map((option) => ({
            id: option.id,
            priceAdjustment: new Prisma.Decimal(option.priceAdjustment).toNumber(),
          })),
        })),
      },
      toSelectedModifiers(item.modifiers),
      toSelectedSubstitutions(item.substitutions),
      item.proteinBoost,
    );

    return {
      mealId: item.mealId,
      rotationId: input.rotationId,
      quantity: item.quantity,
      unitPrice,
      substitutions: item.substitutions as unknown as object[] | undefined,
      modifiers: item.modifiers as unknown as object[] | undefined,
      proteinBoost: item.proteinBoost,
      notes: item.notes,
    };
  });
}

export const cartService = {
  cartInclude,

  async createCart(userId: string, input: CreateCartInput) {
    if (input.requestId) {
      const existingCart = await prisma.cart.findFirst({
        where: {
          userId,
          clientRequestId: input.requestId,
        },
        include: cartInclude,
      });

      if (existingCart) {
        return existingCart;
      }
    }

    const items = await buildCartItemsData(input);

    try {
      return await prisma.cart.create({
        data: {
          clientRequestId: input.requestId,
          userId,
          settlementMethod: input.settlementMethod,
          items: {
            create: items,
          },
        },
        include: cartInclude,
      });
    } catch (error) {
      if (input.requestId && isUniqueConstraintError(error)) {
        const existingCart = await prisma.cart.findFirst({
          where: {
            userId,
            clientRequestId: input.requestId,
          },
          include: cartInclude,
        });

        if (existingCart) {
          return existingCart;
        }
      }

      throw error;
    }
  },

  async getCartById(cartId: string) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: cartInclude,
    });
  },

  async updateCart(cartId: string, input: UpdateCartInput) {
    const nextItems = input.items
      ? await buildCartItemsData({
          rotationId:
            input.rotationId ??
            (await prisma.cart.findUnique({
              where: { id: cartId },
              include: { items: { select: { rotationId: true } } },
            }))?.items[0]?.rotationId ??
            "",
          settlementMethod: input.settlementMethod ?? "STRIPE",
          items: input.items,
        })
      : null;

    return prisma.cart.update({
      where: { id: cartId },
      data: {
        ...(input.settlementMethod ? { settlementMethod: input.settlementMethod } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(nextItems
          ? {
              items: {
                deleteMany: {},
                create: nextItems,
              },
            }
          : {}),
      },
      include: cartInclude,
    });
  },
};
