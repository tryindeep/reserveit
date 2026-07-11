import { Router } from "express";
import { MovieController } from "../controllers/movie.controller";
export const movieRouter = Router();


// static routes
movieRouter.post("/" , MovieController.createMovie);
movieRouter.get("/", MovieController.getAllMovies);
movieRouter.get("/search", MovieController.fetchMovies);

// dynamic routes
movieRouter.get("/:id", MovieController.getMovieById);
movieRouter.patch("/:id", MovieController.updateMovie);
movieRouter.delete("/:id", MovieController.deleteMovie);