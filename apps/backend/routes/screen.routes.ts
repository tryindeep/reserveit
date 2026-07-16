 import { Router } from "express";
import { ScreenController } from "../controllers/screen.controller";
export const screenRouter = Router();


screenRouter.post("/theaters/:theaterId/screens", ScreenController.createScreen);

