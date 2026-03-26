"use client";

import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartNavCount } from "@/components/cart-count-provider";
import { useCartSheet } from "@/components/cart-sheet-context";
import { ShoppingBag } from "lucide-react";

const routes = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
];

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const { data: session, isPending } = useSession();
  const cartItemCount = useCartNavCount();
  const { openCart } = useCartSheet();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-none">
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-white/20 via-white/10 to-transparent opacity-20" />
      <Container className="relative z-10 h-16">
        <div className="flex h-full items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="size-7 bg-primary rounded-sm" />
            <div className="text-lg font-semibold">Free Will Eats</div>
          </div>
          <div className="hidden md:flex items-center gap-12 text-sm font-medium text-white/80">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "transition-colors inline-flex items-center gap-1.5",
                  pathname === route.href ? "text-white" : "text-white/80",
                  "hover:text-white",
                )}
              >
                {route.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={openCart}
              className="transition-colors inline-flex items-center gap-1.5 text-white/80 hover:text-white cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
              {cartItemCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile cart button */}
            <button
              type="button"
              onClick={openCart}
              className="md:hidden relative p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground leading-none">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </button>
            {isPending ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[84px] rounded-md opacity-20" />
                <Skeleton className="h-8 w-[84px] rounded-md opacity-20 bg-primary" />
              </div>
            ) : session ? (
              <>
                <Button
                  variant="outline"
                  asChild
                  className="text-black hover:text-white hover:bg-white/10"
                >
                  <Link href="/profile">View Profile</Link>
                </Button>
                <Button onClick={handleSignOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="text-white hover:text-white hover:bg-white/10"
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild className="bg-primary text-white">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Navbar;

