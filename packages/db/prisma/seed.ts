import { hashPassword } from "better-auth/crypto";

import prisma from "../src/client";
import { Role } from "../src/generated/prisma/enums";

const ADMIN_EMAIL = "admin@fwe.com";
const ADMIN_PASSWORD = "12341234";

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

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Admin",
      role: Role.ADMIN,
      emailVerified: true,
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const credential = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" },
  });

  if (credential) {
    await prisma.account.update({
      where: { id: credential.id },
      data: {
        password: passwordHash,
        accountId: admin.id,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        accountId: admin.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  console.log(`Seeded admin user (${ADMIN_EMAIL})`);
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
