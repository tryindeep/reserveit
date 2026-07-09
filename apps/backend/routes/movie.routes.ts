import { Router } from "express";
import { MovieController } from "../controllers/movie.controller";
export const movieRouter = Router();

movieRouter.post("/" , MovieController.createMovie);
movieRouter.get("/", MovieController.getAllMovies);
movieRouter.get("/:id", MovieController.getMovieById);
movieRouter.put("/:id", MovieController.updateMovie);
movieRouter.delete("/:id", MovieController.deleteMovie);