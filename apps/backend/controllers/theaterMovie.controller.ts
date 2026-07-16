import type { RequestHandler } from "express"
import { theaterMovieService } from "../services/theaterMovie.service"
import { asyncHandler } from "../utils/asyncHandler"
import { sendError, sendSuccess } from "../utils/responseBody"
import { bulkAddMoviesSchema } from "../validators/theaterMovie.validator" 

type TheaterMovieControllerType = {
            addMovieToTheater : RequestHandler,
            removeMovieFromTheater : RequestHandler,
            getMoviesByTheater : RequestHandler,
            getTheatersByMovie : RequestHandler,
            bulkAddMoviesToTheater: RequestHandler 
        }

export const TheaterMovieController : TheaterMovieControllerType = {

    // ADD MOVIE TO THE THEATER
    addMovieToTheater : asyncHandler(async(req, res) => {
        const {movieId, theaterId} = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400, "Invalid Theater ID");
        }
        if(typeof movieId !== "string" || !movieId.trim()){
            return sendError(res , 400, "Invalid Movie ID");
        }

        const result = await theaterMovieService.addMovieToTheater(theaterId, movieId);
        if("error" in result) {
            if(result.error === "THEATER_NOT_FOUND"){
                return sendError(res , 404, "Theater not found");
            }
            if(result.error === "MOVIE_NOT_FOUND"){
                return sendError(res , 404, "Movie not found");
            }
            if(result.error === "ALREADY_EXISTS"){
                return sendError(res , 409, "Movie already added to the theater");
            }
        }
        return sendSuccess(res , 201, result.data, "Movie added to the theater Successfully")
    }),


    //  bulk Add Movies To Theater
    bulkAddMoviesToTheater : asyncHandler(async(req , res) => {
        const {theaterId} = req.params;
         if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400, "Invalid Theater ID");
        }
        const parsed = bulkAddMoviesSchema.safeParse(req.body);
        if(!parsed.success){
            return sendError(res, 400, "Invalid Input", parsed.error.issues);
        }
        const result = await theaterMovieService.bulkAddMoviesToTheater(theaterId, parsed.data?.movieIds);
        if ("error" in result) {
            return sendError(res, 404, "Theater not found");
        }
        return sendSuccess(res, 201, result.data, "Bulk movie add processed");
    }),

    removeMovieFromTheater : asyncHandler(async(req, res) => {
        const {movieId, theaterId} = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400, "Invalid Theater ID");
        }
        if(typeof movieId !== "string" || !movieId.trim()){
            return sendError(res , 400, "Invalid Movie ID");
        }
        const removed = await theaterMovieService.removeMovieFromTheater(theaterId, movieId);
        if(!removed){
            return sendError(res , 404, "This movie is not running in this theater")
        }
        return sendSuccess(res, 200, removed, "Movie removed from theater");
    }),

    // GET ALL MOVIES RUNNING IN A THEATER
    getMoviesByTheater : asyncHandler(async(req,res) => {
        const {theaterId} = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400, "Invalid Theater ID");
        }
        const movies = await theaterMovieService.getMoviesByTheater(theaterId);
        return sendSuccess(res,200,movies);
    }),

     // GET ALL THEATERS SHOWING A MOVIE
     getTheatersByMovie : asyncHandler(async(req , res) => {
        const {movieId} = req.params;
        if(typeof movieId !== "string" || !movieId.trim()){
            return sendError(res , 400, "Invalid Movie ID");
        }
        const theaters = await theaterMovieService.getTheatersByMovie(movieId);
        return sendSuccess(res,200,theaters);
     })
}