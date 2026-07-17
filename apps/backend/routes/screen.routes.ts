import { Router } from "express";
import { ScreenController } from "../controllers/screen.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { requireApprovedClient } from "../middlewares/requiredApprovalClient";
export const screenRouter = Router();


screenRouter.get("/theaters/:theaterId/screens", ScreenController.getScreensByTheater);
screenRouter.get("/screens/:id" , ScreenController.getScreenById);

screenRouter.post("/theaters/:theaterId/screens" , authenticate, authorize("CLIENT"),requireApprovedClient, ScreenController.createScreen);
screenRouter.patch("/screens/:id" , authenticate, authorize("CLIENT"),requireApprovedClient, ScreenController.updateScreen);
screenRouter.delete("/screens/:id" , authenticate, authorize("CLIENT"),requireApprovedClient, ScreenController.deleteScreen);


