import { Router } from "express";
import { TheaterMovieController } from "../controllers/theaterMovie.controller";
export const theaterMovieRouter = Router();


// static route
theaterMovieRouter.get("/movies/:movieId/theaters" , TheaterMovieController.getTheatersByMovie);
theaterMovieRouter.post("/:theaterId/movies/bulk", TheaterMovieController.bulkAddMoviesToTheater)
// dynamic route
theaterMovieRouter.post("/:theaterId/movies/:movieId", TheaterMovieController.addMovieToTheater);
theaterMovieRouter.delete("/:theaterId/movies/:movieId", TheaterMovieController.removeMovieFromTheater);
theaterMovieRouter.get("/:theaterId/movies", TheaterMovieController.getMoviesByTheater);


