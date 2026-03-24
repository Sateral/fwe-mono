import { NextResponse } from "next/server";
import type { Prisma } from "@fwe/db";

import prisma from "@/lib/prisma";
import { requireInternalAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const rotationId = searchParams.get("rotationId");

    if (!rotationId) {
      return NextResponse.json(
        { error: "rotationId is required" },
        { status: 400 },
      );
    }

    // 1. Fetch Orders
    const orders = (await prisma.order.findMany({
      where: {
        rotationId: rotationId,
        paymentStatus: "PAID",
        fulfillmentStatus: { not: "CANCELLED" },
      },
      include: {
        meal: true,
        user: {
          select: {
            name: true,
            email: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryPostal: true,
            deliveryNotes: true,
          },
        },
      },
      orderBy: {
        meal: {
          name: "asc",
        },
      },
    })) as Prisma.OrderGetPayload<{
      include: {
        meal: true;
        user: {
          select: {
            name: true;
            email: true;
            deliveryAddress: true;
            deliveryCity: true;
            deliveryPostal: true;
            deliveryNotes: true;
          };
        };
      };
    }>[];

    // 2. Aggregation Logic
    const summary = new Map<
      string,
      {
        mealId: string;
        mealName: string;
        totalQuantity: number;
        assignedQuantity: number;
        variations: {
          key: string; // signature of mods + subs
          substitutions: any;
          modifiers: any;
          count: number;
        }[];
      }
    >();

    for (const order of orders) {
      if (!summary.has(order.mealId)) {
        summary.set(order.mealId, {
          mealId: order.mealId,
          mealName: order.meal.name,
          totalQuantity: 0,
          assignedQuantity: 0,
          variations: [],
        });
      }

      const entry = summary.get(order.mealId)!;
      entry.totalQuantity += order.quantity;
      if (
        order.settlementMethod === "MEAL_PLAN_CREDITS" &&
        order.orderIntentId === null
      ) {
        entry.assignedQuantity += order.quantity;
      }

      // Variation Handling
      // Create a unique key for this configuration
      const subsStr = order.substitutions
        ? JSON.stringify(order.substitutions)
        : "";
      const modsStr = order.modifiers ? JSON.stringify(order.modifiers) : "";
      const variationKey = `${subsStr}|${modsStr}|${order.proteinBoost}`;

      let variation = entry.variations.find((v) => v.key === variationKey);
      if (!variation) {
        variation = {
          key: variationKey,
          substitutions: order.substitutions,
          modifiers: order.modifiers,
          count: 0,
        };
        entry.variations.push(variation);
      }
      variation.count += order.quantity;
    }

    // 3. Manifest Construction
    const manifest = orders.map((order) => {
      const address =
        order.deliveryMethod === "PICKUP"
          ? `Pickup at ${order.pickupLocation || "Xtreme Couture"}`
          : [order.user.deliveryAddress, order.user.deliveryCity]
              .filter(Boolean)
              .join(", ");

      return {
        customerName: order.user.name,
        address,
        deliveryMethod: order.deliveryMethod,
        pickupLocation: order.pickupLocation,
        meal: order.meal.name,
        quantity: order.quantity,
        details: {
          assignedByChef:
            order.settlementMethod === "MEAL_PLAN_CREDITS" &&
            order.orderIntentId === null,
          substitutions: order.substitutions,
          modifiers: order.modifiers,
          proteinBoost: order.proteinBoost,
          notes: order.notes,
        },
      };
    });

    return NextResponse.json({
      summary: Array.from(summary.values()),
      manifest,
    });
  } catch (error) {
    console.error("Prep Sheet Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
