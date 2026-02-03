"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface RotationContextType {
  selectedRotationId: string | null;
  setSelectedRotationId: (id: string) => void;
}

const RotationContext = React.createContext<RotationContextType | null>(null);

interface RotationProviderProps {
  children: React.ReactNode;
  initialRotationId?: string;
}

/**
 * Provider for managing the selected rotation across the orders dashboard.
 * Uses URL search params as the source of truth for the rotation ID.
 */
export function RotationProvider({
  children,
  initialRotationId,
}: RotationProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get rotation ID from URL or use initial
  const selectedRotationId =
    searchParams.get("rotationId") || initialRotationId || null;

  const setSelectedRotationId = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("rotationId", id);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const value = React.useMemo(
    () => ({
      selectedRotationId,
      setSelectedRotationId,
    }),
    [selectedRotationId, setSelectedRotationId],
  );

  return (
    <RotationContext.Provider value={value}>
      {children}
    </RotationContext.Provider>
  );
}

/**
 * Hook to access the selected rotation ID and setter.
 */
export function useSelectedRotation() {
  const context = React.useContext(RotationContext);
  if (!context) {
    throw new Error(
      "useSelectedRotation must be used within a RotationProvider",
    );
  }
  return context;
}
