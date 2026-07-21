import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { BookingController } from "../controllers/booking.controller";
import { rateLimiter } from "../middlewares/rateLimiter";
export const bookingRouter =  Router();


bookingRouter.use(authenticate)

bookingRouter.post("/hold" ,rateLimiter(5,60), BookingController.holdSeats);
bookingRouter.post("/:id/confirm" , BookingController.confirmBooking);
bookingRouter.post("/:id/cancel" , BookingController.cancelBooking);;
bookingRouter.get("/:id", BookingController.getBookingById);