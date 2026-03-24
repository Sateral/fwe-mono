import { randomUUID } from "node:crypto";
import { Prisma } from "@fwe/db";
import type { GuestCheckoutIdentity } from "@fwe/validators";

import prisma from "@/lib/prisma";

export function normalizeGuestEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildGuestAliasEmail() {
  return `guest.${randomUUID()}@checkout.freewilleats.local`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const guestUserService = {
  async findOrCreateCheckoutGuestUser(input: GuestCheckoutIdentity) {
    const normalizedEmail = normalizeGuestEmail(input.email);
    const trimmedName = input.name.trim();
    const trimmedEmail = input.email.trim();

    const existingGuest = await prisma.user.findFirst({
      where: {
        isGuest: true,
        guestSource: "CHECKOUT",
        guestSourceId: normalizedEmail,
        mergedIntoUserId: null,
      },
    });

    if (existingGuest) {
      return existingGuest;
    }

    try {
      return await prisma.user.create({
        data: {
          name: trimmedName,
          email: buildGuestAliasEmail(),
          isGuest: true,
          guestSource: "CHECKOUT",
          guestSourceId: normalizedEmail,
          guestMetadata: {
            checkoutEmail: trimmedEmail,
            checkoutName: trimmedName,
            normalizedEmail,
          },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const recoveredGuest = await prisma.user.findFirst({
          where: {
            isGuest: true,
            guestSource: "CHECKOUT",
            guestSourceId: normalizedEmail,
            mergedIntoUserId: null,
          },
        });

        if (recoveredGuest) {
          return recoveredGuest;
        }
      }

      throw error;
    }
  },

  async reconcileGuestUserForAuthenticatedUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isGuest: true,
        mergedIntoUserId: true,
      },
    });

    if (!user || user.isGuest || user.mergedIntoUserId) {
      return {
        mergedUserIds: [],
        requiresReview: false,
      };
    }

    const normalizedEmail = normalizeGuestEmail(user.email);
    const matchingGuests = await prisma.user.findMany({
      where: {
        isGuest: true,
        guestSource: "CHECKOUT",
        guestSourceId: normalizedEmail,
        mergedIntoUserId: null,
        NOT: {
          id: user.id,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (matchingGuests.length === 0) {
      return {
        mergedUserIds: [],
        requiresReview: false,
      };
    }

    if (matchingGuests.length > 1) {
      return {
        mergedUserIds: [],
        requiresReview: true,
      };
    }

    const guestUser = matchingGuests[0]!;

    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { userId: guestUser.id },
        data: { userId: user.id },
      });
      await tx.cart.updateMany({
        where: { userId: guestUser.id },
        data: { userId: user.id },
      });
      await tx.orderIntent.updateMany({
        where: { userId: guestUser.id },
        data: { userId: user.id },
      });
      await tx.checkoutSession.updateMany({
        where: { userId: guestUser.id },
        data: { userId: user.id },
      });
      await tx.user.update({
        where: { id: guestUser.id },
        data: {
          guestSourceId: null,
          mergedIntoUserId: user.id,
          mergedAt: new Date(),
        },
      });
    });

    return {
      mergedUserIds: [guestUser.id],
      requiresReview: false,
    };
  },
};
