import {
  ArrowRight,
  CheckCircle,
  ChefHat,
  Clock,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import {
  ensureOrderByStripeSession,
  getOrderByStripeSessionId,
  type Order,
  type OrderSubstitution,
} from "@/lib/order-service";
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

function renderOrderCard(order: Order) {
  const substitutions = order.substitutions as OrderSubstitution[] | null;

  return (
    <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{order.meal.name}</h2>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          {order.fulfillmentStatus}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Order ID</span>
          <span className="font-medium text-gray-900 font-mono">
            {order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Utensils className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              {order.quantity} x ${order.unitPrice.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {order.deliveryMethod === "PICKUP"
                ? `Pickup at ${order.pickupLocation || "Xtreme Couture"}`
                : "Delivery"}
            </p>
          </div>
          <span className="font-medium text-gray-900">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        {(substitutions?.length || order.notes) && (
          <>
            <hr className="border-gray-100" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ChefHat className="w-4 h-4" />
                Customizations
              </div>

              {substitutions?.map((sub, i) => (
                <div key={`${order.id}-${i}`} className="flex justify-between text-sm pl-6">
                  <span className="text-gray-500">{sub.groupName}</span>
                  <span className="text-gray-900">{sub.optionName}</span>
                </div>
              ))}

              {order.notes && (
                <div className="text-sm pl-6">
                  <span className="text-gray-500">Notes: </span>
                  <span className="text-gray-900">{order.notes}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  if (session_id) {
    try {
      await ensureOrderByStripeSession(session_id);
    } catch (error) {
      console.error("[SuccessPage] Failed to sync order:", error);
    }
  }

  if (!session_id) {
    redirect("/menu");
  }

  const orderSession = await getOrderByStripeSessionId(session_id);

  if (!orderSession || orderSession.orders.length === 0) {
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
              We received your payment and are creating your order in our kitchen
              system. This page will update automatically.
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

  const grandTotal = orderSession.orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <Container>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-600">
              We received {orderSession.orders.length} item
              {orderSession.orders.length === 1 ? "" : "s"} in this checkout session.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Session</p>
                <p className="font-mono text-sm text-gray-900">{orderSession.sessionId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Grand total</p>
                <p className="text-2xl font-bold text-gray-900">${grandTotal.toFixed(2)} CAD</p>
              </div>
            </div>
          </div>

          {orderSession.orders.map(renderOrderCard)}

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-3">
              <p className="text-gray-600">Our chefs will start preparing your meals fresh.</p>
              <p className="text-gray-600">You&apos;ll receive updates on your order status.</p>
              <p className="text-gray-600">Your order will be delivered or prepared for pickup.</p>
            </div>
          </div>

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
