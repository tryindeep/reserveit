import { Router } from "express";
import { SeatController } from "../controllers/seat.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { requireApprovedClient } from "../middlewares/requiredApprovalClient";
export const seatRouter = Router();


seatRouter.get("/screens/:screenId/seats" , SeatController.getSeatsByScreen);
seatRouter.post("/screens/:screenId/seats/generate",authenticate,authorize("CLIENT"), requireApprovedClient, SeatController.generateSeats)