import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/authenticate";
export const paymentRouter = Router();

paymentRouter.use(authenticate);
paymentRouter.use("/bookings/:id/create-order" , PaymentController.createOrder);
paymentRouter.use("/verify" , PaymentController.verifyPayment);