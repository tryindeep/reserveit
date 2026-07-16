import z from "zod";

export const registerSchema = z.object({
    email : z.string().min(1).max(200).email("Invalid Email address"),
    password : z.string().min(12).max(200),
    name: z.string().min(1).max(200),
    phone: z.string().optional(),
});

export const registerClientSchema = registerSchema.extend({
    businessName : z.string().min(2).max(300)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});