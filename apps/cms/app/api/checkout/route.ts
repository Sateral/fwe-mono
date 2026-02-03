import { checkoutSessionRequestSchema } from "@fwe/validators";
import { NextResponse } from "next/server";
import { formatLineItemDescription, formatModifiersSummary, formatSubstitutionsSummary } from "@fwe/utils/format-utils";
import { calculateMealUnitPrice } from "@fwe/utils/price-utils";

import { requireInternalAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = checkoutSessionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const meal = await prisma.meal.findUnique({
      where: { id: data.mealId },
      include: {
        substitutionGroups: { include: { options: true } },
        modifierGroups: { include: { options: true } },
        tags: true,
      },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const { rotation } = await weeklyRotationService.getOrCreateOrderingRotation();

    const selectedModifiers: Record<string, string[]> = {};
    if (data.modifiers) {
      for (const m of data.modifiers) {
        selectedModifiers[m.groupId] = m.optionIds;
      }
    }

    const selectedSubstitutions: Record<string, string> = {};
    if (data.substitutions) {
      for (const s of data.substitutions) {
        selectedSubstitutions[s.groupId] = s.optionId;
      }
    }

    const verifiedUnitPrice = calculateMealUnitPrice(
      {
        price: meal.price,
        modifierGroups: meal.modifierGroups.map((group) => ({
          id: group.id,
          options: group.options.map((option) => ({
            id: option.id,
            extraPrice: option.extraPrice,
          })),
        })),
        substitutionGroups: meal.substitutionGroups.map((group) => ({
          id: group.id,
          options: group.options.map((option) => ({
            id: option.id,
            priceAdjustment: option.priceAdjustment,
          })),
        })),
      },
      selectedModifiers,
      selectedSubstitutions,
      data.proteinBoost,
    );

    const totalAmount = verifiedUnitPrice * data.quantity;

    const description = formatLineItemDescription(
      meal,
      data.substitutions,
      data.modifiers,
      data.proteinBoost,
      data.notes,
      data.deliveryMethod,
      data.pickupLocation,
    );

    const substitutionsSummary = formatSubstitutionsSummary(
      data.substitutions,
    ).slice(0, 200);
    const modifiersSummary = formatModifiersSummary(data.modifiers).slice(0, 200);

    let orderIntent = null;
    if (data.requestId) {
      orderIntent = await prisma.orderIntent.findUnique({
        where: { clientRequestId: data.requestId },
      });
    }

    if (!orderIntent) {
      orderIntent = await prisma.orderIntent.create({
        data: {
          clientRequestId: data.requestId,
          userId: data.userId,
          mealId: data.mealId,
          rotationId: rotation.id,
          quantity: data.quantity,
          unitPrice: verifiedUnitPrice,
          totalAmount,
          currency: "cad",
          substitutions: data.substitutions as unknown as object[] | undefined,
          modifiers: data.modifiers as unknown as object[] | undefined,
          proteinBoost: data.proteinBoost,
          notes: data.notes,
          deliveryMethod: data.deliveryMethod,
          pickupLocation: data.pickupLocation,
          status: "CREATED",
        },
      });
    }

    if (orderIntent.stripeSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(
        orderIntent.stripeSessionId,
      );
      return NextResponse.json({
        id: existingSession.id,
        url: existingSession.url,
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: data.userEmail,
        currency: "cad",
        client_reference_id: orderIntent.id,
        line_items: [
          {
            price_data: {
              currency: "cad",
              product_data: {
                name: meal.name,
                description: description.substring(0, 1000),
                ...(meal.imageUrl && { images: [meal.imageUrl] }),
              },
              unit_amount: Math.round(verifiedUnitPrice * 100),
            },
            quantity: data.quantity,
          },
        ],
        metadata: {
          orderIntentId: orderIntent.id,
          userId: data.userId,
          userName: data.userName ?? "",
          mealId: meal.id,
          mealSlug: meal.slug,
          mealName: meal.name,
          quantity: data.quantity.toString(),
          unitPrice: verifiedUnitPrice.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          rotationId: rotation.id,
          rotationWeekStart: rotation.weekStart.toISOString(),
          substitutions: data.substitutions
            ? JSON.stringify(
                data.substitutions.map((s) => ({
                  groupName: s.groupName,
                  optionName: s.optionName,
                })),
              )
            : "",
          modifiers: data.modifiers
            ? JSON.stringify(
                data.modifiers.map((m) => ({
                  groupName: m.groupName,
                  optionNames: m.optionNames,
                })),
              )
            : "",
          substitutionsSummary,
          modifiersSummary,
          proteinBoost: data.proteinBoost ? "true" : "false",
          deliveryMethod: data.deliveryMethod,
          pickupLocation:
            data.deliveryMethod === "PICKUP" ? data.pickupLocation || "" : "",
          notes: data.notes?.slice(0, 400) || "",
        },
        success_url: `${WEB_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${WEB_BASE_URL}/order/${meal.slug}`,
      },
      {
        idempotencyKey: orderIntent.id,
      },
    );

    await prisma.orderIntent.update({
      where: { id: orderIntent.id },
      data: {
        status: "SESSION_CREATED",
        stripeSessionId: checkoutSession.id,
        stripePaymentIntentId: checkoutSession.payment_intent as string | null,
      },
    });

    return NextResponse.json({
      id: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("[API] Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
