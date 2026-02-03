import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { getMealById } from "@/actions/meal-services";
import { mealsApi } from "@/lib/cms-api";
import { calculateMealUnitPrice } from "@/lib/price-utils";
import {
  formatLineItemDescription,
  formatSubstitutionsSummary,
  formatModifiersSummary,
} from "@/lib/format-utils";
import { checkoutRateLimiter } from "@/lib/rate-limit";

// ============================================
// Validation Schema
// ============================================

const SubstitutionSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
});

const ModifierSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionIds: z.array(z.string()),
  optionNames: z.array(z.string()),
});

const DeliveryMethodSchema = z.enum(["DELIVERY", "PICKUP"]);

const CheckoutRequestSchema = z.object({
  mealId: z.string().min(1, "Meal ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  // unitPrice: z.number().positive("Unit price must be positive"), // IGNORED for security
  substitutions: z.array(SubstitutionSchema).optional(),
  modifiers: z.array(ModifierSchema).optional(),
  proteinBoost: z.boolean().default(false),
  deliveryMethod: DeliveryMethodSchema.optional().default("DELIVERY"),
  pickupLocation: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// ============================================
// Route Handler
// ============================================

export async function POST(request: NextRequest) {
  // Rate limiting: 5 checkout attempts per minute per IP
  const rateLimitResult = await checkoutRateLimiter.check(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CheckoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Fetch meal to get current details
    const meal = await getMealById(data.mealId);
    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // ============================================
    // SERVER-SIDE PRICE CALCULATION
    // ============================================

    // Transform modifiers for calculator (Code -> Record<groupId, optionIds>)
    const selectedModifiers: Record<string, string[]> = {};
    if (data.modifiers) {
      for (const m of data.modifiers) {
        selectedModifiers[m.groupId] = m.optionIds;
      }
    }

    // Transform substitutions for calculator (Code -> Record<groupId, optionId>)
    const selectedSubstitutions: Record<string, string> = {};
    if (data.substitutions) {
      for (const s of data.substitutions) {
        selectedSubstitutions[s.groupId] = s.optionId;
      }
    }

    // Calculate verified unit price
    const verifiedUnitPrice = calculateMealUnitPrice(
      meal,
      selectedModifiers,
      selectedSubstitutions,
      data.proteinBoost
    );

    const totalAmount = verifiedUnitPrice * data.quantity;

    // Generate description and summaries
    const description = formatLineItemDescription(
      meal,
      data.substitutions,
      data.modifiers,
      data.proteinBoost,
      data.notes,
      data.deliveryMethod,
      data.pickupLocation
    );

    const substitutionsSummary = formatSubstitutionsSummary(
      data.substitutions
    ).slice(0, 200);
    const modifiersSummary = formatModifiersSummary(data.modifiers).slice(
      0,
      200
    );

    // Fetch active rotation to lock in at checkout time
    // This ensures the order goes to the correct delivery week even if
    // rotation changes between checkout and payment completion
    const activeRotation = await mealsApi.getActiveRotation();
    if (!activeRotation) {
      return NextResponse.json(
        { error: "Ordering is currently closed. Please try again later." },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      currency: "cad",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: meal.name,
              description: description.substring(0, 1000), // Stripe limit
              ...(meal.imageUrl && { images: [meal.imageUrl] }),
            },
            unit_amount: Math.round(verifiedUnitPrice * 100), // Use verified price
          },
          quantity: data.quantity,
        },
      ],
      // Metadata for webhook to create order
      metadata: {
        userId: session.user.id,
        userName: session.user.name,
        mealId: meal.id,
        mealSlug: meal.slug,
        mealName: meal.name,
        quantity: data.quantity.toString(),
        unitPrice: verifiedUnitPrice.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        // Lock in rotation at checkout time (not fulfillment time)
        rotationId: activeRotation.id,
        rotationWeekStart: activeRotation.weekStart,
        // Serialize complex data
        substitutions: data.substitutions
          ? JSON.stringify(
              data.substitutions.map((s) => ({
                groupName: s.groupName,
                optionName: s.optionName,
              }))
            )
          : "",
        modifiers: data.modifiers
          ? JSON.stringify(
              data.modifiers.map((m) => ({
                groupName: m.groupName,
                optionNames: m.optionNames,
              }))
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
      success_url: `${process.env.BETTER_AUTH_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BETTER_AUTH_URL}/order/${meal.slug}`,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
