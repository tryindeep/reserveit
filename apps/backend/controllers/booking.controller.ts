import type { RequestHandler } from "express"
import { sendError, sendSuccess } from "../utils/responseBody"
import { BookingService } from "../services/booking.service"
import { handleServiceError } from "../utils/errorMap"
import { holdBookingSchema } from "../validators/booking.validator"
import { asyncHandler } from "../utils/asyncHandler"

type BookingControllerType = {
    holdSeats : RequestHandler
    confirmBooking : RequestHandler
    cancelBooking : RequestHandler
    getBookingById : RequestHandler

}

export const BookingController : BookingControllerType = {
    holdSeats: asyncHandler(async (req, res) => {
        const parsed = holdBookingSchema.safeParse(req.body);
        if (!parsed.success) return sendError(res, 400, "Invalid Input");
        const result = await BookingService.holdSeats(req.user!.userId, parsed.data.showtimeId, parsed.data.seatIds);
        if ("error" in result) return handleServiceError(res, result.error ?? "Unknown error");
        return sendSuccess(res, 201, result.data, "Seat held. Complete payment within 5 minutes.");
    }),
    confirmBooking: asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Booking Id");
        const result = await BookingService.confirmBooking(id, req.user!.userId);
        if ("error" in result) return handleServiceError(res, result.error ?? "Unknown error");
        return sendSuccess(res, 200, result.data, "Booking Confirmed!");
    }),

    cancelBooking: asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Booking Id");
        const result = await BookingService.cancelBooking(id, req.user!.userId);
        if ("error" in result) return handleServiceError(res, result.error ?? "Unknown error");
        return sendSuccess(res, 200, result.data, "Booking Cancelled!");
    }),

    getBookingById : asyncHandler(async(req , res) => {
        const { id } = req.params;
    if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Booking Id");

    const result = await BookingService.getBookingById(id, req.user!.userId);
    if ("error" in result) return handleServiceError(res, result.error ?? "Unknown error");
    return sendSuccess(res, 200, result.data);
    }),
}