import z from "zod";

export const createMovieSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  casts: z.array(z.string()).min(1),
  trailerUrl: z.url(),
  language: z.string().default("English"),
  releaseDate: z.coerce.date(),
  director: z.string().min(1),
  releaseStatus: z.enum(["RELEASED", "UPCOMING", "CANCELLED"]).default("RELEASED"),
});

export const updateMovieSchema = createMovieSchema.partial();
