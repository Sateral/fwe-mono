import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getRotations } from "@/lib/actions/weekly-rotation.actions";
import { RotationProvider } from "@/lib/context/rotation-context";
import { PrepManifestDashboard } from "./_components/prep-manifest-dashboard";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

export default async function PrepPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

  if (!resolvedParams.rotationId) {
    const rotations = await getRotations();
    const first = rotations[0];
    if (first) {
      redirect(`/dashboard/prep?rotationId=${first.id}`);
    }
  }

  return (
    <Suspense fallback={<PrepManifestSkeleton />}>
      <RotationProvider initialRotationId={resolvedParams.rotationId}>
        <PrepManifestDashboard />
      </RotationProvider>
    </Suspense>
  );
}

function PrepManifestSkeleton() {
  return (
    <div className="animate-pulse p-6 pt-4">
      <div className="h-9 w-64 rounded bg-muted" />
      <div className="mt-4 h-[560px] rounded-lg bg-muted" />
    </div>
  );
}
