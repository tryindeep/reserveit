import type { RequestHandler } from "express";
import z from "zod";
import { MovieService } from "../services/movie.service";

const createMovieSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  casts: z.array(z.string()).min(1),
  trailerUrl: z.url(),
  language: z.string().default("English"),
  releaseDate: z.coerce.date(),
  director: z.string().min(1),
  releaseStatus: z.enum(["RELEASED", "UPCOMING", "CANCELLED"]).default("RELEASED"),
});

type MovieControllerType = {
    createMovie: RequestHandler;

}

export const MovieController : MovieControllerType = {

    // CREATE 
    createMovie:  async (req,res) => {
        try {
            const parsed = createMovieSchema.safeParse(req.body);
            if(!parsed.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Input",
                    errors: parsed.error.issues
                });
            }
            const movie = await MovieService.createMovie({
                ...parsed.data,
                releaseDate: parsed.data.releaseDate.toISOString(),
            })
            return res.status(201).json({
                success: true,
                data: movie
            })
        } catch (error) {
            console.error("create Movie Error : ", error);
            return res.status(500).json({
                success : false,
                message : "Internal Server Error"
            })
        }
    },
}