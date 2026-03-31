import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare } from "lucide-react";

const FinalHook = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="relative bg-white rounded-2xl sm:rounded-4xl border border-gray-300 p-5 sm:p-8 md:p-16 overflow-hidden inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px]">
          {/* Dotted Pattern Background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 lg:gap-12">
            <div className="space-y-3 sm:space-y-4 text-center lg:text-left max-w-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                Let's plan dinner for the next week
              </h2>
              <p className="text-base sm:text-lg text-gray-500">
                Discover the most popular and delicious chef-prepared meals
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Button className="rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-medium bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Build a plan
              </Button>
              <Button
                variant="outline"
                className="rounded-full h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-medium border-gray-200 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Get in Contact
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FinalHook;
