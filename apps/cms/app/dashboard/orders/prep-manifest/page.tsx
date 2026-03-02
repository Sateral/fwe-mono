import { Suspense } from "react";
import { RotationProvider } from "@/lib/context/rotation-context";
import { PrepManifestDashboard } from "../_components/prep-manifest-dashboard";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

export default async function PrepManifestPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

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
