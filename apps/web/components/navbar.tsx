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
import {
  ShoppingBag,
  Menu,
  X,
  User,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useState, useEffect } from "react";

const routes = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
];

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: session, isPending } = useSession();
  const cartItemCount = useCartNavCount();
  const { openCart } = useCartSheet();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  const handleOpenCart = () => {
    setMobileMenuOpen(false);
    openCart();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-none">
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-white/20 via-white/10 to-transparent opacity-20" />
      <Container className="relative z-10 h-14 sm:h-16">
        <div className="flex h-full items-center justify-between text-white">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="size-6 sm:size-7 bg-primary rounded-sm" />
            <div className="text-base sm:text-lg font-semibold">
              Free Will Eats
            </div>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* Mobile: Cart + Hamburger */}
          <div className="flex md:hidden items-center gap-1">
            {/* Mobile cart button */}
            <button
              type="button"
              onClick={handleOpenCart}
              className="relative p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 rounded-full bg-primary min-w-[16px] h-4 px-1 text-[10px] font-semibold text-primary-foreground leading-4 text-center">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </button>

            {/* Hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/80 hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 top-14 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="md:hidden fixed inset-x-0 top-14 z-50 bg-white border-b border-gray-200 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <Container className="py-4">
              {/* Navigation Links */}
              <nav className="flex flex-col gap-1 mb-4">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      pathname === route.href
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    {route.label}
                  </Link>
                ))}
              </nav>

              {/* Divider */}
              <div className="h-px bg-gray-200 mb-4" />

              {/* Auth Section */}
              <div className="flex flex-col gap-1">
                {isPending ? (
                  <div className="flex flex-col gap-2 px-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : session ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      View Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors mt-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </Container>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
