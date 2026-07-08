import { Router } from "express";
import { MovieController } from "../controllers/movie.controller";
export const movieRouter = Router();

movieRouter.post("/" , MovieController.createMovie);