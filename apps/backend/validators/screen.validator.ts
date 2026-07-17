import z from "zod";
export const createScreenSchema = z.object({
    name: z.string().min(1).max(100),
    totalSeats: z.number().int().positive(),
    screenType: z.enum(["STANDARD", "IMAX", "FOUR_DX", "GOLD_CLASS", "RECLINER"]).optional(),
});
export const updateScreenSchema = createScreenSchema.partial();