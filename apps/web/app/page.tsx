import Hero from "@/components/landing/hero";
import MeetChef from "@/components/landing/meet-chef";
import FeaturedMenu from "@/components/landing/featured-menu";
import Testimonials from "@/components/landing/testimonials";
// TODO: Re-enable once Instagram token and credentials are set up
// import InstagramShowcase from "@/components/landing/instagram-showcase";
import FinalHook from "@/components/landing/final-hook";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className={`${plusJakartaSans.className} bg-background`}>
      <main>
        <section>
          <Hero />
        </section>

        <section className="py-16">
          <MeetChef />
        </section>

        <FeaturedMenu />

        <Testimonials />

        {/* TODO: Re-enable once Instagram token and credentials are set up */}
        {/* <InstagramShowcase /> */}

        <FinalHook />
      </main>
    </div>
  );
}
