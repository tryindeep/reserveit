import type { RequestHandler } from "express" 
import { asyncHandler } from "../utils/asyncHandler"
import { handleServiceError } from "../utils/errorMap"
import { SeatService } from "../services/seat.service"
import { sendError, sendSuccess } from "../utils/responseBody"
import { generateSeatsSchema } from "../validators/seat.validator"

type SeatControllerType = {
    getSeatsByScreen : RequestHandler,
    generateSeats : RequestHandler
}
export const SeatController : SeatControllerType = {
    generateSeats : asyncHandler(async(req , res) => {
        const {screenId} = req.params;
        if(typeof screenId !== "string"  || !screenId.trim()) return sendError(res , 400, "Invalid Screen ID!");

        const parsed = generateSeatsSchema.safeParse(req.body);
        if(!parsed.success) return sendError(res, 400, "Invalid Input" , parsed.error.issues);

        const result = await SeatService.generateSeats(screenId , req.client!.id, parsed.data);
        if ("error" in result) return handleServiceError(res, result.error!);
        return sendSuccess(res, 201, result.data, "Seats generated successfully");
    }),
    getSeatsByScreen : asyncHandler(async(req , res) => {
        const { screenId } = req.params;
        if (typeof screenId !== "string" || !screenId.trim()) return sendError(res, 400, "Invalid Screen Id");
        return sendSuccess(res, 200, await SeatService.getSeatsByScreen(screenId));
    })
}