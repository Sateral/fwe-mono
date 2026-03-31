import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, ChevronRight } from "lucide-react";

const MeetChef = () => {
  return (
    <Container className="py-10 sm:py-16 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Column: Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 sm:space-y-8">
          <Badge
            variant="secondary"
            className="px-3 py-1.5 text-xs sm:text-sm font-normal rounded-full gap-2 bg-gray-200 hover:bg-gray-200 text-gray-700 border-0"
          >
            <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Meet the chef
          </Badge>

          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
              Meet The Chef Behind It All
            </h2>
            {/* TODO: Replace with real chef bio */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-500 leading-relaxed max-w-xl">
              Passionate about clean eating and bold flavors, our chef brings
              years of experience crafting nutritious meals that fuel your week
              without sacrificing taste.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-full h-10 sm:h-12 text-sm sm:text-base group"
          >
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 px-1">
              About the Chef
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Button>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full pt-2 sm:pt-4">
            <StatsCard number="5 +" label="Years cooking" />
            <StatsCard number="100%" label="Locally sourced" />
            <StatsCard number="Weekly" label="Menu refresh" />
          </div>
        </div>

        {/* Right Column: Video */}
        <div className="flex items-center justify-center order-first lg:order-last">
          <video
            src="https://m442dxa43u.ufs.sh/f/TNpuVpfVedFJXyd3V3lge2v9P7DMYbrQdGn3hSVfuow5asLE"
            controls
            playsInline
            className="rounded-2xl sm:rounded-4xl shadow-xl max-w-full"
          />
        </div>
      </div>
    </Container>
  );
};

const StatsCard = ({ number, label }: { number: string; label: string }) => (
  <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="flex flex-col items-center justify-center p-3 sm:p-6 text-center h-full">
      <span className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">
        {number}
      </span>
      <span className="text-xs sm:text-sm text-gray-500 font-light">
        {label}
      </span>
    </CardContent>
  </Card>
);

export default MeetChef;
