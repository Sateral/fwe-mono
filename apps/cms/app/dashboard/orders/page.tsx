import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getRotations } from "@/lib/actions/weekly-rotation.actions";
import { RotationProvider } from "@/lib/context/rotation-context";
import { OrdersDashboard } from "./_components/orders-dashboard";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

  if (!resolvedParams.rotationId) {
    const rotations = await getRotations();
    const first = rotations[0];
    if (first) {
      redirect(`/dashboard/orders?rotationId=${first.id}`);
    }
  }

  return (
    <Suspense fallback={<OrdersDashboardSkeleton />}>
      <RotationProvider initialRotationId={resolvedParams.rotationId}>
        <OrdersDashboard />
      </RotationProvider>
    </Suspense>
  );
}

function OrdersDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 pt-4 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
        <div className="h-9 w-64 bg-muted rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 h-56 bg-muted rounded-lg" />
        <div className="lg:col-span-5 h-56 bg-muted rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 h-72 bg-muted rounded-lg" />
        <div className="lg:col-span-7 h-72 bg-muted rounded-lg" />
      </div>
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
}
