import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireInternalAuth } from "@/lib/api-auth";
import { DEFAULT_PICKUP_LOCATION } from "@/lib/constants/order.constants";
import { getEffectiveOrderFulfillment } from "@/lib/order-fulfillment-contact";
import { aggregatePrepByMeal } from "@/lib/prep-aggregate";

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

    const orders = await prisma.order.findMany({
      where: {
        rotationId: rotationId,
        paymentStatus: "PAID",
        fulfillmentStatus: { not: "CANCELLED" },
      },
      include: {
        meal: true,
        substitutions: true,
        modifiers: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
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
    });

    const summary = aggregatePrepByMeal(orders);

    const manifest = orders.map((order) => {
      const effective = getEffectiveOrderFulfillment(order);
      const address =
        order.deliveryMethod === "PICKUP"
          ? `Pickup at ${order.pickupLocation || DEFAULT_PICKUP_LOCATION}`
          : [effective.deliveryAddress, effective.deliveryCity]
              .filter(Boolean)
              .join(", ");

      return {
        customerName: effective.customerName,
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
          notes: order.notes,
        },
      };
    });

    return NextResponse.json({
      summary,
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
