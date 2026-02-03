import { auth } from "@/lib/auth";

const newUser = await auth.api.createUser({
  body: {
    email: "admin@freewilleats.com",
    password: "password123",
    name: "Admin",
    role: "admin",
  },
});

console.log(newUser);
