import { Router } from "express";
const authRouter =  Router();
import { authController } from "../controllers/auth.controller";

authRouter.post("/register", authController.register);
authRouter.post("/register/client" , authController.registerClient);
authRouter.post("login" , authController.login);

export default authRouter;