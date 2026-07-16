import z from "zod";

export const createTheaterSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).optional(),
    city: z.string().min(1).max(100),
    address: z.string().min(1).max(200),
    state: z.string().min(1).max(200).optional(),
    pincode: z.string().min(1).max(200).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    totalScreens: z.number().int().positive().default(1),
    amenities: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});
export const updateTheaterSchema = createTheaterSchema.partial(); 
export const getTheatersQuerySchema = z.object({
  city: z.string().min(1).optional(),
  pincode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});