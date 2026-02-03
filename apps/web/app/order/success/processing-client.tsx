"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface ProcessingClientProps {
  sessionId?: string;
}

export default function ProcessingClient({ sessionId }: ProcessingClientProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const maxAttempts = 12;

  const delayMs = useMemo(() => {
    return Math.min(3000 + attempt * 2000, 15000);
  }, [attempt]);

  useEffect(() => {
    if (attempt >= maxAttempts) return;
    const timer = setTimeout(() => {
      router.refresh();
      setAttempt((prev) => prev + 1);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [attempt, delayMs, router]);

  const exhausted = attempt >= maxAttempts;

  return (
    <div className="text-center mt-4 space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
      <p className="text-sm text-muted-foreground">
        Checking for confirmation
        {!exhausted ? ` (${attempt + 1}/${maxAttempts})` : ""}
      </p>
      {sessionId && (
        <p className="text-xs text-muted-foreground">
          Session ID: <span className="font-mono">{sessionId}</span>
        </p>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          Refresh now
        </Button>
      </div>
      {exhausted && (
        <p className="text-xs text-muted-foreground">
          Still processing. If this continues for more than a few minutes,
          contact support and include the session ID.
        </p>
      )}
    </div>
  );
}
