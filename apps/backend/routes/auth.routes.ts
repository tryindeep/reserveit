import { Router } from "express";
export const authRouter =  Router();
import { authController } from "../controllers/auth.controller";
import { rateLimiter } from "../middlewares/rateLimiter";

authRouter.post("/register", authController.register);
authRouter.post("/register/client" , authController.registerClient);
authRouter.post("/login" ,rateLimiter(5,60), authController.login);

