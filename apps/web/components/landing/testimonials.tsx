import Image from "next/image";
import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Quote, Star } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string; // e.g., "Foodie", "Busy Mom" - optional context
  content: string;
  rating: number;
  avatar: string;
}

// TODO: Replace MOCK_TESTIMONIALS with real data from CMS API or a testimonials table
const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "John Doe",
    role: "Regular Customer",
    content:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet consectetur adipiscing elit.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "2",
    name: "Jane Smith",
    role: "Healthy Eater",
    content:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet consectetur adipiscing elit. Sit amet consectetur adipiscing elit.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "3",
    name: "Mike Johnson",
    role: "Chef",
    content:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet consectetur adipiscing elit.",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
  },
];

const Testimonials = () => {
  return (
    <section className="bg-gray-50/50 py-20">
      <Container>
        <div className="flex flex-col items-center text-center space-y-4 mb-16">
          <Badge
            variant="secondary"
            className="px-4 py-1.5 text-sm font-normal rounded-full gap-2 bg-gray-200 hover:bg-gray-200 text-gray-700 border-0"
          >
            <MessageSquare className="w-4 h-4" />
            Testimonials
          </Badge>

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Why Choose Us
            </h2>
            <p className="text-lg text-gray-500">
              Hear what our customers say about their experience
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </Container>
    </section>
  );
};

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-4xl h-full">
    <CardContent className="p-8 flex flex-col h-full">
      <Quote className="w-8 h-8 text-yellow-500 mb-6" />

      <p className="text-gray-600 text-lg leading-relaxed mb-8 grow">
        {testimonial.content}
      </p>

      <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900">{testimonial.name}</span>
          </div>
        </div>

        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < testimonial.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Testimonials;
