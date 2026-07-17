import { Router } from "express";
import { TheaterMovieController } from "../controllers/theaterMovie.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

export const theaterMovieRouter = Router();

theaterMovieRouter.get("/movies/:movieId/theaters", TheaterMovieController.getTheatersByMovie);
theaterMovieRouter.post("/:theaterId/movies/bulk", authenticate, authorize("SYSTEM_ADMIN"), TheaterMovieController.bulkAddMoviesToTheater);
theaterMovieRouter.post("/:theaterId/movies/:movieId", authenticate, authorize("SYSTEM_ADMIN"), TheaterMovieController.addMovieToTheater);
theaterMovieRouter.delete("/:theaterId/movies/:movieId", authenticate, authorize("SYSTEM_ADMIN"), TheaterMovieController.removeMovieFromTheater);
theaterMovieRouter.get("/:theaterId/movies", TheaterMovieController.getMoviesByTheater);