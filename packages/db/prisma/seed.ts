import prisma from "../src/client";

async function main() {
  const tags = [
    { name: "High Protein" },
    { name: "Vegan" },
    { name: "Gluten Free" },
    { name: "Keto" },
    { name: "Vegetarian" },
    { name: "Dairy Free" },
  ];

  for (const tag of tags) {
    await prisma.dietaryTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  console.log("Seeded tags");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
