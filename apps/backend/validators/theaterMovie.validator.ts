import z from "zod";

export const bulkAddMoviesSchema = z.object({
  movieIds: z.array(z.string().min(1)).min(1, "At least one movie id is required"),
});
