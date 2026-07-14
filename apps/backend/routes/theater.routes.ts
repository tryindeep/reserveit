import { Router } from "express";
import { TheaterController } from "../controllers/theater.controller";
export const theaterRouter = Router();


// static routes 
theaterRouter.post("/", TheaterController.createTheater);
theaterRouter.get("/", TheaterController.getAllTheaters);
theaterRouter.get("/search", TheaterController.fetchTheater);

// dynamic routes 
theaterRouter.get("/:id", TheaterController.getTheaterById);
theaterRouter.patch("/:id", TheaterController.updateTheater);
theaterRouter.delete("/:id", TheaterController.deleteTheater);

