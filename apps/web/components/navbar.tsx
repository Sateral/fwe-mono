"use client";

import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { Skeleton } from "@/components/ui/skeleton";

const routes = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
];

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const { data: session, isPending, error, refetch } = useSession();

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
                  "transition-colors",
                  pathname === route.href ? "text-white" : "text-white/80",
                  "hover:text-white",
                )}
              >
                {route.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
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
