import { Router } from "express";
import { TheaterController } from "../controllers/theater.controller";
import { requireApprovedClient } from "../middlewares/requiredApprovalClient";
import { authorize } from "../middlewares/authorize";
import { authenticate } from "../middlewares/authenticate";
export const theaterRouter = Router();


// static routes 
theaterRouter.post("/", authenticate, authorize("CLIENT"), requireApprovedClient, TheaterController.createTheater);
theaterRouter.get("/", TheaterController.getAllTheaters);
theaterRouter.get("/search", TheaterController.fetchTheater);

// dynamic routes 
theaterRouter.get("/:id", TheaterController.getTheaterById);
theaterRouter.patch("/:id", authenticate, authorize("CLIENT"), requireApprovedClient, TheaterController.updateTheater);
theaterRouter.delete("/:id", authenticate, authorize("CLIENT"), requireApprovedClient, TheaterController.deleteTheater);

