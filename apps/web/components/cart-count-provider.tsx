"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const CartCountContext = createContext<{
  count: number;
  setCartItemCount: (n: number) => void;
} | null>(null);

export function CartCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  return (
    <CartCountContext.Provider
      value={{ count, setCartItemCount: setCount }}
    >
      {children}
    </CartCountContext.Provider>
  );
}

export function useCartNavCount() {
  const ctx = useContext(CartCountContext);
  if (!ctx) {
    throw new Error("useCartNavCount must be used within CartCountProvider");
  }
  return ctx.count;
}

export function useSetCartNavCount() {
  const ctx = useContext(CartCountContext);
  return ctx?.setCartItemCount ?? (() => {});
}
