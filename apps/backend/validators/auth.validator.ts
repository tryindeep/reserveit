import z from "zod";

export const registerSchema = z.object({
    email : z.string().min(1).max(200).email("Invalid Email address"),
    password : z.string().min(12).max(200),
    name: z.string().min(1).max(200),
    phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number with 8 to 15 digits"),
});

export const registerClientSchema = registerSchema.extend({
    businessName : z.string().min(2).max(300)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
