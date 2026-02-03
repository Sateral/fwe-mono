import Image from "next/image";
import Link from "next/link";
import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  ArrowRight,
  Utensils,
  Leaf,
  Beef,
  ChevronRight,
} from "lucide-react";

interface MenuItem {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  tags: {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }[];
}

const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    title: "Miso Salmon Bowl",
    price: 12,
    description:
      "Charred salmon, sesame rice, quick-pickled veg, miso dressing.",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800",
    tags: [
      {
        label: "Protein",
        icon: <Beef className="w-3 h-3" />,
        variant: "secondary",
        className: "bg-red-100 text-red-700 hover:bg-red-200 border-0",
      },
    ],
  },
  {
    id: "2",
    title: "Crispy Chicken",
    price: 12,
    description:
      "Charred salmon, sesame rice, quick-pickled veg, miso dressing.",
    image:
      "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&q=80&w=800",
    tags: [
      {
        label: "Chef's Choice",
        icon: <Utensils className="w-3 h-3" />,
        variant: "secondary",
        className: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-0",
      },
    ],
  },
  {
    id: "3",
    title: "Garden Bowl",
    price: 12,
    description:
      "Charred salmon, sesame rice, quick-pickled veg, miso dressing.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
    tags: [
      {
        label: "Light",
        icon: <Leaf className="w-3 h-3" />,
        variant: "secondary",
        className: "bg-green-100 text-green-700 hover:bg-green-200 border-0",
      },
    ],
  },
];

const FeaturedMenu = () => {
  return (
    <section className="bg-gray-50/50 py-20">
      <Container>
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <Badge
            variant="secondary"
            className="px-4 py-1.5 text-sm font-normal rounded-full gap-2 bg-gray-200 hover:bg-gray-200 text-gray-700 border-0"
          >
            <BookOpen className="w-4 h-4" />
            Meals
          </Badge>

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
              Featured Menu Selection
            </h2>
            <p className="text-lg text-gray-500">
              Discover the most popular and delicious chef-prepared meals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {MOCK_MENU_ITEMS.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            className="rounded-full h-12 text-base group"
          >
            <div className="flex flex-row items-center justify-center gap-3 px-1">
              View More
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Button>
        </div>
      </Container>
    </section>
  );
};

const MenuCard = ({ item }: { item: MenuItem }) => (
  <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white rounded-4xl p-6">
    <div className="relative h-64 w-full overflow-hidden">
      <div className="relative h-full w-full rounded-3xl overflow-hidden">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
    <CardContent className="p-0">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
        <span className="text-lg font-semibold text-gray-900">
          ${item.price}
        </span>
      </div>

      <p className="text-gray-500 text-sm mb-6 line-clamp-2">
        {item.description}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex gap-2">
          {item.tags.map((tag, index) => (
            <Badge
              key={index}
              variant={tag.variant}
              className={`px-3 py-1 rounded-full gap-1.5 font-normal ${tag.className}`}
            >
              {tag.icon}
              {tag.label}
            </Badge>
          ))}
        </div>

        <Link
          href="#"
          className="inline-flex items-center text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          More
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </Link>
      </div>
    </CardContent>
  </Card>
);

export default FeaturedMenu;
