import {
  ArrowRight,
  CheckCircle,
  ChefHat,
  Clock,
  Package,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import {
  getOrderByStripeSessionId,
  type OrderSubstitution,
} from "@/lib/order-service";
import { fulfillOrder } from "@/lib/stripe-service";
import ProcessingClient from "./processing-client";

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export const metadata = {
  title: "Order Confirmed | Free Will Eats",
  description: "Your order has been placed successfully",
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  // Layer 1: Attempt to fulfill order immediately on page load
  if (session_id) {
    try {
      await fulfillOrder(session_id);
    } catch (error) {
      // We swallow the error here because the Webhook (Layer 2)
      // or Cron (Layer 3) will likely catch it.
      // We don't want to crash the success page for the user.
      console.error("[SuccessPage] Failed to sync order:", error);
    }
  }

  if (!session_id) {
    redirect("/menu");
  }

  const order = await getOrderByStripeSessionId(session_id);

  if (!order) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Confirming Your Order
            </h1>
            <p className="text-gray-600 mb-8">
              We received your payment and are creating your order in our
              kitchen system. This page will update automatically.
            </p>
            <ProcessingClient sessionId={session_id} />
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link href="/menu">
                  Back to Menu
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Parse substitutions from JSON
  const substitutions = order.substitutions as OrderSubstitution[] | null;

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <Container>
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-600">
              Thank you for your order. We&apos;ll start preparing your meal
              right away.
            </p>
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Order Details
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {order.fulfillmentStatus}
              </span>
            </div>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <span className="font-medium text-gray-900 font-mono">
                  {order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <hr className="border-gray-100" />

              {/* Meal Details */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {order.meal.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {order.quantity} × ${order.unitPrice.toFixed(2)}
                  </p>
                </div>
                <span className="font-medium text-gray-900">
                  ${(order.quantity * order.unitPrice).toFixed(2)}
                </span>
              </div>

              {/* Customizations */}
              {(substitutions?.length || order.proteinBoost || order.notes) && (
                <>
                  <hr className="border-gray-100" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <ChefHat className="w-4 h-4" />
                      Customizations
                    </div>

                    {substitutions?.map((sub, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm pl-6"
                      >
                        <span className="text-gray-500">{sub.groupName}</span>
                        <span className="text-gray-900">{sub.optionName}</span>
                      </div>
                    ))}

                    {order.proteinBoost && (
                      <div className="flex justify-between text-sm pl-6">
                        <span className="text-gray-500">Protein Boost</span>
                        <span className="text-gray-900">+30%</span>
                      </div>
                    )}

                    {order.notes && (
                      <div className="text-sm pl-6">
                        <span className="text-gray-500">Notes: </span>
                        <span className="text-gray-900">{order.notes}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <hr className="border-gray-100" />

              {/* Total */}
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  ${order.totalAmount.toFixed(2)} CAD
                </span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <p className="text-gray-600">
                  Our chefs will start preparing your meal fresh
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <p className="text-gray-600">
                  You&apos;ll receive updates on your order status
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <p className="text-gray-600">
                  Your order will be delivered fresh to your door
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/menu">Continue Shopping</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/menu">
                Order Another Meal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
