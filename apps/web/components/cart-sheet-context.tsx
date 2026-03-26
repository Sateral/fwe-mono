"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type CartSheetContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartSheetContext = createContext<CartSheetContextType | null>(null);

export function CartSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  return (
    <CartSheetContext.Provider value={{ open, setOpen, openCart, closeCart }}>
      {children}
    </CartSheetContext.Provider>
  );
}

export function useCartSheet() {
  const ctx = useContext(CartSheetContext);
  if (!ctx) {
    throw new Error("useCartSheet must be used within CartSheetProvider");
  }
  return ctx;
}
