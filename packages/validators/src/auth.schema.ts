import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long",
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters long",
  }),
  email: z.email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long",
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const guestCheckoutIdentitySchema = z.object({
  name: z.string().trim().min(1, {
    message: "Name is required",
  }),
  email: z.string().trim().email({
    message: "Valid email required",
  }),
});

export type GuestCheckoutIdentity = z.infer<typeof guestCheckoutIdentitySchema>;
