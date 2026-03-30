"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Syncs `rotationId` into the URL without a server redirect.
 * Server `redirect()` rejects the RSC root; in dev, React Flight can then call
 * `performance.measure` with an invalid end time and throw (e.g. "OrdersPage"
 * negative timestamp). Client replace avoids that path while keeping shareable URLs.
 */
export function OrdersRotationUrlSync({ rotationId }: { rotationId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("rotationId") === rotationId) return;
    params.set("rotationId", rotationId);
    router.replace(`/dashboard/orders?${params.toString()}`);
  }, [rotationId, router]);

  return null;
}
