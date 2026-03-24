import { prisma } from "../packages/db";

const user = await prisma.user.findUnique({
  where: {
    email: "admin@fwe.com",
  },
});

console.log(user);
