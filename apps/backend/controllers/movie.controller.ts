import type { RequestHandler } from "express";
import z, { success } from "zod";
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

const updateMovieSchema = createMovieSchema.partial();

type MovieControllerType = {
    createMovie: RequestHandler,
    getAllMovies: RequestHandler,
    getMovieById: RequestHandler,
    updateMovie: RequestHandler,
    deleteMovie: RequestHandler,
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
    
    // GET ALL MOVIES
    getAllMovies : async ( req, res) => {
       try {
            const movies = await MovieService.getAllMovies();
            return res.status(200).json({
                success: true,
                data: movies
            });
       } catch (error) {
        console.error("getAllMovies : ", error);
        return res.status(500).json({
            success: false,
            message : "Internal server error"
        })
       }
    },

    // GET MOVIE BY ID 
    getMovieById : async (req , res) => {
        try {
            const { id } = req.params;
            const movie = await MovieService.getMovieById(id);
            if(!movie){
                return res.status(404).json({
                    success: false, 
                    message: "Movie not found"
                });
            }
            return res.status(200).json({
                success : true,
                data : movie
            })
        } catch (error) {
            console.error("getMovieById : ", error);
            return res.status(500).json({
                success: false,
                message : "Internal server error"  });
        }
    },

    // update
    updateMovie :  async (req , res) => {
        try {
            const { id } = req.params;
            
            const parsed = updateMovieSchema.safeParse(req.body);
            if(!parsed.success) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Input",
                    errors: parsed.error.issues
                });
            }
            const updatedMovie = await MovieService.updateMovie(id , parsed.data)
            if(!updatedMovie){
                return res.status(404).json({
                    success: false,
                    message : "Movie not found"
                })
            }
            return res.status(200).json({success : true, data: updatedMovie})
        } catch (error) {
            console.error("updateMovie : ", error);
            return res.status(500).json({
                success: false,
                message : "Internal server error"  });
        }
    },

    // Delete Movie
    deleteMovie : async (req , res) => {
        try {
            const { id } = req.params;
            const deleted = await MovieService.deleteMovie(id);
            if(!deleted){
                return res.status(200).json({
                    success: false, 
                    message: "Movie not found"
                })

            }
            return res.status(200).json({
                success : true,
                data : "Movie deleted success fully"
            })
            
        } catch (error) {
            console.error("deleteMovie : ", error);
            return res.status(500).json({
                success: false,
                message : "Internal server error"  });
        }
        

    }
}