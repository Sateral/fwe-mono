import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getMealBySlug } from "@/actions/meal-services";
import { getServerSession } from "@/lib/auth-server";
import OrderPageClient from "@/components/order/order-page-client";
import {
  GUEST_FULFILLMENT_COOKIE,
  decodeGuestFulfillmentPreference,
} from "@/lib/cart-cookies";
import { getCartForRequest } from "@/lib/get-cart-for-request";
import { hydrateOrderBuilderFromCartLine } from "@/lib/order-from-cart-line";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

interface OrderPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
}

export async function generateMetadata({ params }: OrderPageProps) {
  const { slug } = await params;
  const meal = await getMealBySlug(slug);

  if (!meal) {
    return {
      title: "Meal Not Found | Free Will Eats",
    };
  }

  return {
    title: `Order ${meal.name} | Free Will Eats`,
    description:
      meal.description || `Order ${meal.name} - a delicious chef-prepared meal`,
  };
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { slug } = await params;
  const { edit: editCartItemId } = await searchParams;
  const meal = await getMealBySlug(slug);
  const session = await getServerSession();
  const cookieStore = await cookies();

  if (!meal) {
    notFound();
  }

  const initialFulfillment = session?.user
    ? null
    : decodeGuestFulfillmentPreference(
        cookieStore.get(GUEST_FULFILLMENT_COOKIE)?.value,
      );

  const trimmedEditId = editCartItemId?.trim() || null;
  let initialEditBuilder: ReturnType<
    typeof hydrateOrderBuilderFromCartLine
  > | null = null;
  if (trimmedEditId) {
    const cart = await getCartForRequest();
    if (!cart) {
      redirect(`/order/${meal.slug}`);
    }
    const line = cart.items.find((i) => i.id === trimmedEditId);
    if (!line || line.mealId !== meal.id) {
      redirect(`/order/${meal.slug}`);
    }
    initialEditBuilder = hydrateOrderBuilderFromCartLine(line, meal);
  }

  return (
    <div className={plusJakartaSans.className}>
      <OrderPageClient
        key={trimmedEditId ?? "new"}
        meal={meal}
        editCartItemId={trimmedEditId}
        initialEditBuilder={initialEditBuilder}
        initialCustomer={
          session?.user
            ? {
                email: session.user.email,
                name: session.user.name ?? "",
              }
            : null
        }
        initialFulfillment={initialFulfillment}
      />
    </div>
  );
}
