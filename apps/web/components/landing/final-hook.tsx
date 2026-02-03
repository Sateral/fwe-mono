import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare } from "lucide-react";

const FinalHook = () => {
  return (
    <section className="py-20">
      <Container>
        <div className="relative bg-white rounded-4xl border border-gray-300 p-8 md:p-16 overflow-hidden inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px]">
          {/* Dotted Pattern Background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="space-y-4 text-center lg:text-left max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                Let's plan dinner for the next week
              </h2>
              <p className="text-lg text-gray-500">
                Discover the most popular and delicious chef-prepared meals
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <Button className="rounded-full h-14 px-8 text-base font-medium bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all">
                <Calendar className="w-5 h-5 mr-2" />
                Build a plan
              </Button>
              <Button
                variant="outline"
                className="rounded-full h-14 px-8 text-base font-medium border-gray-200 hover:bg-gray-50"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
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
