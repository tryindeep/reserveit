import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { requireApprovedClient } from "../middlewares/requiredApprovalClient";
import { ShowtimeController } from "../controllers/showtime.controller";

export const showtimeRouter = Router();


showtimeRouter.get("/screens/:screenId/showtimes" , ShowtimeController.getShowtimesByScreen);
showtimeRouter.get("/movies/:movieId/showtimes" , ShowtimeController.getShowtimesByMovie);
showtimeRouter.get("/showtimes/:id" , ShowtimeController.getShowtimeById);

showtimeRouter.post("/showtimes" ,authenticate, authorize("CLIENT"), requireApprovedClient, ShowtimeController.createShowtime);
showtimeRouter.patch("/showtimes/:id" ,authenticate, authorize("CLIENT"), requireApprovedClient, ShowtimeController.updateShowtime);
showtimeRouter.delete("/showtimes/:id" ,authenticate, authorize("CLIENT"), requireApprovedClient, ShowtimeController.deleteShowtime);
showtimeRouter.get("/showtimes/:id/seats", ShowtimeController.getShowtimeSeats);


