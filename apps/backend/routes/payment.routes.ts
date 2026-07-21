import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/authenticate";
export const paymentRouter = Router();

paymentRouter.use(authenticate);
paymentRouter.post("/bookings/:id/create-order" , PaymentController.createOrder);
paymentRouter.post("/verify" , PaymentController.verifyPayment);