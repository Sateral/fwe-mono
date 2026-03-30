import { Prisma, PriceSource } from "@fwe/db";
import type {
  CreateCartInput,
  CreateCartItemInput,
  UpdateCartInput,
} from "@fwe/validators";

import prisma from "@/lib/prisma";
import { cartLineFingerprint } from "./cart-line-fingerprint";
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
      substitutions: true,
      modifiers: true,
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

/** Shape returned by buildCartItemsData for a single line. */
interface BuiltCartRow {
  mealId: string;
  rotationId: string;
  quantity: number;
  unitPrice: number;
  priceSource: PriceSource;
  notes: string | undefined;
  substitutions: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
  }>;
  modifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
  }>;
}

function fingerprintFromBuiltRow(row: BuiltCartRow) {
  return cartLineFingerprint({
    mealId: row.mealId,
    notes: row.notes,
    substitutions: row.substitutions,
    modifiers: row.modifiers,
  });
}

function fingerprintFromCartItem(item: {
  mealId: string;
  notes: string | null;
  substitutions: Array<{ groupId: string | null; optionId: string | null }>;
  modifiers: Array<{ groupId: string | null; optionId: string | null }>;
}) {
  return cartLineFingerprint({
    mealId: item.mealId,
    notes: item.notes,
    substitutions: item.substitutions,
    modifiers: item.modifiers,
  });
}

async function buildCartItemsData(input: CreateCartInput): Promise<BuiltCartRow[]> {
  const priceSource: PriceSource =
    input.settlementMethod === "MEAL_PLAN_CREDITS"
      ? PriceSource.MEAL_PLAN
      : PriceSource.STANDARD;

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
    );

    // Resolve substitution snapshot strings
    const substitutions = (item.substitutions ?? []).map((sub) => {
      const group = meal.substitutionGroups.find((g) => g.id === sub.groupId);
      const option = group?.options.find((o) => o.id === sub.optionId);
      return {
        groupId: sub.groupId,
        groupName: sub.groupName ?? group?.name ?? sub.groupId,
        optionId: sub.optionId,
        optionName: sub.optionName ?? option?.name ?? sub.optionId,
      };
    });

    // Resolve modifier snapshot strings — one row per selected option
    const modifiers: BuiltCartRow["modifiers"] = [];
    for (const mod of item.modifiers ?? []) {
      const group = meal.modifierGroups.find((g) => g.id === mod.groupId);
      for (const optId of mod.optionIds) {
        const option = group?.options.find((o) => o.id === optId);
        modifiers.push({
          groupId: mod.groupId,
          groupName: mod.groupName ?? group?.name ?? mod.groupId,
          optionId: optId,
          optionName: option?.name ?? optId,
        });
      }
    }

    return {
      mealId: item.mealId,
      rotationId: input.rotationId,
      quantity: item.quantity,
      unitPrice,
      priceSource,
      notes: item.notes,
      substitutions,
      modifiers,
    };
  });
}

export const cartService = {
  cartInclude,

  async createCart(userId: string, input: CreateCartInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new Error(
        `User not found for cart. Sign in again or use guest checkout; your account may not exist in the ordering database.`,
      );
    }

    const rotation = await prisma.weeklyRotation.findUnique({
      where: { id: input.rotationId },
      select: { id: true },
    });
    if (!rotation) {
      throw new Error(
        `Rotation not found: ${input.rotationId}. Try refreshing the menu; the ordering window may have updated.`,
      );
    }

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
            create: items.map((row) => ({
              mealId: row.mealId,
              rotationId: row.rotationId,
              quantity: row.quantity,
              unitPrice: row.unitPrice,
              priceSource: row.priceSource,
              notes: row.notes,
              substitutions: {
                create: row.substitutions,
              },
              modifiers: {
                create: row.modifiers,
              },
            })),
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

    if (nextItems) {
      // Delete existing cart items (and their junction rows cascade)
      await prisma.cartItem.deleteMany({ where: { cartId } });
    }

    return prisma.cart.update({
      where: { id: cartId },
      data: {
        ...(input.settlementMethod ? { settlementMethod: input.settlementMethod } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(nextItems
          ? {
              items: {
                create: nextItems.map((row) => ({
                  mealId: row.mealId,
                  rotationId: row.rotationId,
                  quantity: row.quantity,
                  unitPrice: row.unitPrice,
                  priceSource: row.priceSource,
                  notes: row.notes,
                  substitutions: { create: row.substitutions },
                  modifiers: { create: row.modifiers },
                })),
              },
            }
          : {}),
      },
      include: cartInclude,
    });
  },

  /**
   * Latest ACTIVE cart for user. If items target a different ordering rotation than
   * `rotationId`, the cart is abandoned so a fresh week does not mix with the prior window.
   */
  async getActiveCartForUserAndRotation(userId: string, rotationId: string) {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: cartInclude,
    });

    if (!cart) {
      return null;
    }

    if (cart.items.length === 0) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { status: "ABANDONED" },
      });
      return null;
    }

    const existingRot = cart.items[0]?.rotationId;
    if (existingRot && existingRot !== rotationId) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { status: "ABANDONED" },
      });
      return null;
    }

    return cart;
  },

  async addOrMergeItems(
    cartId: string,
    ownerUserId: string,
    rotationId: string,
    items: CreateCartItemInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });

      if (!cart || cart.userId !== ownerUserId) {
        throw new Error("Cart not found");
      }

      if (cart.status !== "ACTIVE") {
        throw new Error("Cart is not active");
      }

      if (cart.items.length > 0) {
        const existingRot = cart.items[0]?.rotationId;
        if (existingRot && existingRot !== rotationId) {
          throw new Error("Rotation mismatch");
        }
      }

      const newRows = await buildCartItemsData({
        rotationId,
        settlementMethod: cart.settlementMethod,
        items,
      });

      // Build fingerprint map of existing items
      const byFp = new Map<string, { id: string; quantity: number }>();
      for (const e of cart.items) {
        byFp.set(fingerprintFromCartItem(e), {
          id: e.id,
          quantity: e.quantity,
        });
      }

      for (const row of newRows) {
        const fp = fingerprintFromBuiltRow(row);
        const match = byFp.get(fp);
        if (match) {
          const nextQty = match.quantity + row.quantity;
          await tx.cartItem.update({
            where: { id: match.id },
            data: {
              quantity: nextQty,
              unitPrice: new Prisma.Decimal(row.unitPrice),
              priceSource: row.priceSource,
            },
          });
          byFp.set(fp, { ...match, quantity: nextQty });
        } else {
          const created = await tx.cartItem.create({
            data: {
              cartId,
              mealId: row.mealId,
              rotationId: row.rotationId,
              quantity: row.quantity,
              unitPrice: new Prisma.Decimal(row.unitPrice),
              priceSource: row.priceSource,
              notes: row.notes,
              substitutions: { create: row.substitutions },
              modifiers: { create: row.modifiers },
            },
          });
          byFp.set(fp, {
            id: created.id,
            quantity: created.quantity,
          });
        }
      }

      const result = await tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });
      if (!result) {
        throw new Error("Cart not found after update");
      }
      return result;
    });
  },

  async setCartItemQuantity(
    cartId: string,
    itemId: string,
    ownerUserId: string,
    quantity: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId },
        include: { cart: true },
      });

      if (!item || item.cart.userId !== ownerUserId) {
        throw new Error("Cart item not found");
      }

      if (item.cart.status !== "ACTIVE") {
        throw new Error("Cart is not active");
      }

      if (quantity <= 0) {
        await tx.cartItem.delete({ where: { id: itemId } });
        const remaining = await tx.cartItem.count({ where: { cartId } });
        if (remaining === 0) {
          await tx.cart.update({
            where: { id: cartId },
            data: { status: "ABANDONED" },
          });
        }
      } else {
        await tx.cartItem.update({
          where: { id: itemId },
          data: { quantity },
        });
      }

      return tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });
    });
  },

  async replaceCartLine(
    cartId: string,
    itemId: string,
    ownerUserId: string,
    item: CreateCartItemInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({
        where: { id: itemId, cartId },
        include: {
          cart: true,
          substitutions: true,
          modifiers: true,
        },
      });

      if (!existing || existing.cart.userId !== ownerUserId) {
        throw new Error("Cart item not found");
      }

      if (existing.cart.status !== "ACTIVE") {
        throw new Error("Cart is not active");
      }

      if (item.mealId !== existing.mealId) {
        throw new Error("Meal cannot be changed for this cart line");
      }

      const rotationId = existing.rotationId;
      if (!rotationId) {
        throw new Error("Cart line is missing rotation");
      }

      const rows = await buildCartItemsData({
        rotationId,
        settlementMethod: existing.cart.settlementMethod,
        items: [item],
      });
      const row = rows[0];
      if (!row) {
        throw new Error("Failed to build cart line");
      }

      const newFp = fingerprintFromBuiltRow(row);

      const siblings = await tx.cartItem.findMany({
        where: { cartId },
        include: { substitutions: true, modifiers: true },
      });

      const mergeTarget = siblings.find(
        (line) =>
          line.id !== itemId &&
          fingerprintFromCartItem(line) === newFp,
      );

      if (mergeTarget) {
        const nextQty = mergeTarget.quantity + row.quantity;
        await tx.cartItem.update({
          where: { id: mergeTarget.id },
          data: {
            quantity: nextQty,
            unitPrice: new Prisma.Decimal(row.unitPrice),
            priceSource: row.priceSource,
          },
        });
        await tx.cartItem.delete({ where: { id: itemId } });
      } else {
        // Delete old junction rows and replace with new ones
        await tx.cartItemSubstitution.deleteMany({ where: { cartItemId: itemId } });
        await tx.cartItemModifier.deleteMany({ where: { cartItemId: itemId } });

        await tx.cartItem.update({
          where: { id: itemId },
          data: {
            quantity: row.quantity,
            unitPrice: new Prisma.Decimal(row.unitPrice),
            priceSource: row.priceSource,
            notes: row.notes,
            substitutions: { create: row.substitutions },
            modifiers: { create: row.modifiers },
          },
        });
      }

      const result = await tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });
      if (!result) {
        throw new Error("Cart not found after update");
      }
      return result;
    });
  },
};
