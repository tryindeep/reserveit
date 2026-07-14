import z from "zod";
import { MovieService } from "../services/movie.service";
import { asyncHandler } from "../utils/asyncHandler";
import type { RequestHandler } from "express";
import { sendError, sendSuccess } from "../utils/responseBody";

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

const updateMovieSchema = createMovieSchema.partial();

type MovieControllerType = {
    createMovie  : RequestHandler,
    getAllMovies : RequestHandler,
    getMovieById : RequestHandler,
    fetchMovies  : RequestHandler
    updateMovie  : RequestHandler,
    deleteMovie  : RequestHandler,
}

export const MovieController : MovieControllerType = {

    // CREATE 
    createMovie:  asyncHandler(async (req,res) => {
            const parsed = createMovieSchema.safeParse(req.body);
            if(!parsed.success) {
                return sendError(res , 400 , "Invalid" , parsed.error.issues);
            }
            const movie = await MovieService.createMovie({
                ...parsed.data,
                releaseDate: parsed.data.releaseDate.toISOString(),
            })
            return sendSuccess(res , 201, movie, "Successfully created the movie");
        }
    ),

    // GET ALL MOVIES
    getAllMovies : asyncHandler(async ( req, res) => {
        const movies = await MovieService.getAllMovies();
        return sendSuccess(res , 200, movies)
    }),

    // GET MOVIE BY ID 
    getMovieById : asyncHandler(async (req , res) => {
            const { id } = req.params;
            if (typeof id !== "string" || !id.trim()) {
                return sendError(res, 400, "Invalid movie id");
            }
            const movie = await MovieService.getMovieById(id);
            if(!movie){
                return sendError(res , 404, "Movie not found")
            }
            return sendSuccess(res , 200, movie)
    }),


    // fetch movie by name
    fetchMovies : asyncHandler(async (req , res) => {
            const name = req.query.name;
            if (typeof name !== "string" || !name.trim()) {
                return sendError(res, 400, "Invalid movie name");
            }
            const foundMovies = await MovieService.fetchMovies(name);
            if(!foundMovies || foundMovies.length == 0){
                return sendError(res , 404, "Not found any movies on this name");
            }
            return sendSuccess(res , 200, foundMovies);
    }),
    // update
    updateMovie :  asyncHandler(async (req , res) => {
            const { id } = req.params;
            if (typeof id !== "string" || !id.trim()) {
                return sendError(res, 400, "Invalid movie id");
            }
            const parsed = updateMovieSchema.safeParse(req.body);
            if(!parsed.success) {
                return sendError(res , 400, "Invalid Input", parsed.error.issues);
            }
            const updateData = {
                ...parsed.data,
                releaseDate: parsed.data.releaseDate?.toISOString(),
            };
            const updatedMovie = await MovieService.updateMovie(id , updateData)
            if(!updatedMovie){
                return sendError(res , 404, "Movie not found")
            }
            return sendSuccess(res, 200, updatedMovie, "Movie has been updated")
    }),

    // Delete Movie
    deleteMovie : asyncHandler(async (req , res) => {
            const { id } = req.params;
            if (typeof id !== "string" || !id.trim()) {
                return sendError(res, 400, "Invalid movie id");
            }
            const deleted = await MovieService.deleteMovie(id);
            if(!deleted){
                return sendError(res, 404, "Movie not found")
            }
            return sendSuccess (res, 200, deleted, "Movie deleted successfully")
    })
};