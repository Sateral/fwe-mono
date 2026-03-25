import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function getMatches(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  const handler = () => onStoreChange();
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    getMatches,
    () => false,
  );
}
