import { notFound } from "next/navigation";
import { getMealBySlug } from "@/actions/meal-services";
import { getServerSession } from "@/lib/auth-server";
import OrderPageClient from "@/components/order/order-page-client";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

interface OrderPageProps {
  params: Promise<{
    slug: string;
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

export default async function OrderPage({ params }: OrderPageProps) {
  const { slug } = await params;
  const meal = await getMealBySlug(slug);
  const session = await getServerSession();

  if (!meal) {
    notFound();
  }

  return (
    <div className={plusJakartaSans.className}>
      <OrderPageClient
        meal={meal}
        initialCustomer={
          session?.user
            ? {
                email: session.user.email,
                name: session.user.name ?? "",
              }
            : null
        }
      />
    </div>
  );
}
