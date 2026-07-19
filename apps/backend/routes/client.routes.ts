import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { ClientController } from "../controllers/client.controller";

export const clientRouter = Router();

clientRouter.get("/pending", authenticate, authorize("SYSTEM_ADMIN"), ClientController.getPendingClients);
clientRouter.get("/:id", authenticate, authorize("SYSTEM_ADMIN"), ClientController.getClientById);
clientRouter.patch("/:id/status", authenticate, authorize("SYSTEM_ADMIN"), ClientController.updateClientStatus);