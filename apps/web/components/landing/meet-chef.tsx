import Image from "next/image";
import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, ChevronRight } from "lucide-react";

const MeetChef = () => {
  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Content */}
        <div className="flex flex-col items-start space-y-8">
          <Badge
            variant="secondary"
            className="px-4 py-2 text-sm font-normal rounded-full gap-2 bg-gray-200 hover:bg-gray-200 text-gray-700 border-0"
          >
            <ChefHat className="w-4 h-4" />
            Meet the chef
          </Badge>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Meet The Chef Behind It All
            </h2>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-xl">
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet
              consectetur adipiscing elit quisque faucibus ex. Adipiscing elit
              quisque faucibus ex sapien vitae pellentesque.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-full h-12 text-base group"
          >
            <div className="flex flex-row items-center justify-center gap-3 px-1">
              About the Chef
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Button>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4">
            <StatsCard number="5 +" label="Years cooking" />
            <StatsCard number="100%" label="Locally sourced" />
            <StatsCard number="Weekly" label="Menu refresh" />
          </div>
        </div>

        {/* Right Column: Image */}
        <div className="relative h-[500px] lg:h-[600px] w-full rounded-4xl overflow-hidden shadow-xl">
          <Image
            src="/images/self-portrait.jpg"
            alt="Chef cooking in the kitchen"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
    </Container>
  );
};

const StatsCard = ({ number, label }: { number: string; label: string }) => (
  <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
      <span className="text-2xl font-bold text-gray-900 mb-1">{number}</span>
      <span className="text-sm text-gray-500 font-light">{label}</span>
    </CardContent>
  </Card>
);

export default MeetChef;
