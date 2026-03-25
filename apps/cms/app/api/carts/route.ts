import { Prisma } from "@fwe/db";
import { createCartSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeCart } from "@/lib/api-serializers";
import { cartService } from "@/lib/services/cart.service";
import { guestUserService } from "@/lib/services/guest-user.service";

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createCartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let userId = request.headers.get("x-user-id")?.trim() ?? null;
    if (!userId && parsed.data.guest) {
      const guestUser = await guestUserService.findOrCreateCheckoutGuestUser(
        parsed.data.guest,
      );
      userId = guestUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const cart = await cartService.createCart(userId, parsed.data);

    return NextResponse.json(serializeCart(cart), { status: 201 });
  } catch (error) {
    console.error("[API] Failed to create cart:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Cart could not be created: invalid user, meal, or rotation. Try signing out and back in, or refresh the page.",
          },
          { status: 400 },
        );
      }
    }

    if (error instanceof Error) {
      const msg = error.message;
      if (
        msg.startsWith("Meal ") ||
        msg.startsWith("User not found") ||
        msg.startsWith("Rotation not found")
      ) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
  }
}
