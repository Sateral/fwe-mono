import { Role } from "@fwe/db";

import { auth } from "@/lib/auth";

const adminRole = Role.ADMIN as unknown as "admin" | "user";

const newUser = await auth.api.createUser({
  body: {
    email: "admin@freewilleats.com",
    password: "password123",
    name: "Admin",
    role: adminRole,
  },
});

console.log(newUser);
