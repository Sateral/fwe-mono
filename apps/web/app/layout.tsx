import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import { CartCountProvider } from "@/components/cart-count-provider";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import Footer from "@/components/landing/footer";
import { countCartItemQuantity } from "@/lib/cart-item-count";
import { getCartForRequest } from "@/lib/get-cart-for-request";

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

  return (
    <html lang="en">
      <body className={`${workSans.className} antialiased`}>
        <CartCountProvider initialCount={initialCartItemCount}>
          <Navbar />
          {children}
          <Footer />
          <Toaster position="top-center" closeButton />
        </CartCountProvider>
      </body>
    </html>
  );
}
