import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import {
  Facebook,
  Instagram,
  Youtube,
  ArrowUpRight,
  Circle,
} from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#111111] text-white py-8 sm:py-10">
      <Container>
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-5 sm:gap-6 mb-8 sm:mb-12">
          <div className="max-w-2xl text-center md:text-left">
            {/* TODO: Replace with real brand tagline */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-medium leading-tight text-gray-200">
              Chef-crafted meals, prepared fresh{" "}
              <br className="hidden sm:block" />
              <span className="text-gray-500">
                and delivered to your door weekly
              </span>
            </h2>
          </div>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 hover:cursor-pointer text-white rounded-full px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium group"
          >
            <Link href="/menu">
              View Menu
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Middle Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 md:mb-8 mb-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8">
              <div className="absolute inset-0 bg-primary rounded-full opacity-20" />
              <Circle className="w-7 h-7 sm:w-8 sm:h-8 text-primary fill-primary/20" />
            </div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              Free Will Eats
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12">
            {[
              { label: "Home", href: "/" },
              { label: "Menu", href: "/menu" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Socials */}
          <div className="flex gap-3 sm:gap-4">
            {/* {[Youtube, Facebook, Instagram].map((Icon, i) => ( */}
            <Link
              href="https://www.instagram.com/freewilleats/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
            </Link>
            {/* Commented out for now - Facebook and YouTube
            <Link
              key={i}
              href="#"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
            </Link>
            ))} */}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 sm:pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-gray-400">
          <p>Copyright © 2026 Free Will Eats - All Rights Reserved</p>
          <div className="flex gap-6 sm:gap-8">
            <Link
              href="#"
              className="hover:text-white transition-colors font-medium"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="hover:text-white transition-colors font-medium"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
