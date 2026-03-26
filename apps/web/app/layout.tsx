import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import { CartCountProvider } from "@/components/cart-count-provider";
import { CartSheetProvider } from "@/components/cart-sheet-context";
import CartSheet from "@/components/cart-sheet";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/landing/footer";
import { countCartItemQuantity } from "@/lib/cart-item-count";
import { getCartForRequest } from "@/lib/get-cart-for-request";
import { getServerSession } from "@/lib/auth-server";
import {
  GUEST_CART_PROFILE_COOKIE,
  GUEST_FULFILLMENT_COOKIE,
  decodeGuestCartProfile,
  decodeGuestFulfillmentPreference,
} from "@/lib/cart-cookies";

const workSans = Work_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Free Will Eats",
  description: "Chef-crafted meal prep, delivered weekly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cart = await getCartForRequest();
  const initialCartItemCount = countCartItemQuantity(cart);

  const session = await getServerSession();
  const cookieStore = await cookies();
  const initialGuestProfile = session?.user
    ? null
    : decodeGuestCartProfile(cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value);
  const initialFulfillment = session?.user
    ? null
    : decodeGuestFulfillmentPreference(cookieStore.get(GUEST_FULFILLMENT_COOKIE)?.value);

  return (
    <html lang="en">
      <body className={`${workSans.className} antialiased`}>
        <CartCountProvider initialCount={initialCartItemCount}>
          <CartSheetProvider>
            <Navbar />
            {children}
            <CartSheet
              initialCart={cart}
              initialGuestProfile={initialGuestProfile}
              initialFulfillment={initialFulfillment}
            />
            <Footer />
            <Toaster position="top-center" closeButton />
          </CartSheetProvider>
        </CartCountProvider>
      </body>
    </html>
  );
}

