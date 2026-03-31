"use client";

import * as React from "react";
import Image from "next/image";
import Container from "@/components/container";
import { Card } from "@/components/ui/card";
import {
  Instagram,
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface Reel {
  id: string;
  thumbnail: string;
  likes: string;
  comments: string;
}

// TODO: Replace MOCK_REELS with real Instagram data (API integration or CMS-managed)
const MOCK_REELS: Reel[] = [
  {
    id: "1",
    thumbnail:
      "https://images.unsplash.com/photo-1556908153-1055164fe2df?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    likes: "1.2k",
    comments: "82",
  },
  {
    id: "2",
    thumbnail:
      "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?auto=format&fit=crop&q=80&w=400&h=700",
    likes: "1.2k",
    comments: "82",
  },
  {
    id: "3",
    thumbnail:
      "https://images.unsplash.com/photo-1600803907087-f56d462fd26b?q=80&w=2127&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    likes: "1.2k",
    comments: "82",
  },
  {
    id: "4",
    thumbnail:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=400&h=700",
    likes: "1.2k",
    comments: "82",
  },
  {
    id: "5",
    thumbnail:
      "https://images.unsplash.com/photo-1586357334053-81901a64fbd4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    likes: "1.2k",
    comments: "82",
  },
];

const InstagramShowcase = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 overflow-hidden">
      <Container>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-12 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              My Showcase
            </h2>
            <p className="text-base sm:text-lg text-gray-500">
              Follow my journey on Instagram
            </p>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-4">
              {MOCK_REELS.map((reel) => (
                <CarouselItem
                  key={reel.id}
                  className="pl-3 sm:pl-4 basis-2/3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                >
                  <ReelCard reel={reel} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Controls & Tracker */}
        <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 sm:w-12 sm:h-12 border-gray-200"
              onClick={() => api?.scrollPrev()}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 sm:w-12 sm:h-12 border-gray-200"
              onClick={() => api?.scrollNext()}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
          <div className="text-xs sm:text-sm font-medium text-gray-500">
            Slide {current} of {count}
          </div>
        </div>
      </Container>
    </section>
  );
};

const ReelCard = ({ reel }: { reel: Reel }) => (
  <Card className="w-full aspect-9/16 relative overflow-hidden rounded-2xl sm:rounded-4xl border-0 group cursor-pointer">
    <Image
      src={reel.thumbnail}
      alt="Instagram Reel"
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 66vw, (max-width: 1024px) 50vw, 25vw"
    />

    {/* Overlay Gradient */}
    <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/60" />

    {/* Content */}
    <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-white">
      <div className="flex justify-between items-end mt-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium">
          <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>@freewilleats</span>
        </div>

        <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium">
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{reel.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{reel.comments}</span>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

export default InstagramShowcase;
