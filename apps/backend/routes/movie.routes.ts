import { Router } from "express";
import { MovieController } from "../controllers/movie.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
export const movieRouter = Router();

movieRouter.post("/", authenticate, authorize("SYSTEM_ADMIN"), MovieController.createMovie);
movieRouter.get("/", MovieController.getAllMovies);
movieRouter.get("/search", MovieController.fetchMovies);

movieRouter.get("/:id", MovieController.getMovieById);
movieRouter.patch("/:id", authenticate, authorize("SYSTEM_ADMIN"), MovieController.updateMovie);
movieRouter.delete("/:id", authenticate, authorize("SYSTEM_ADMIN"), MovieController.deleteMovie);