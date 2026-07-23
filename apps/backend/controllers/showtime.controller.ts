import type { RequestHandler , Response } from "express";
import { sendError, sendSuccess } from "../utils/responseBody"
import { asyncHandler } from "../utils/asyncHandler";
import { createShowtimeSchema, updatedShowtimeSchema } from "../validators/showtime.validator";
import { ShowtimeService } from "../services/showtime.service";
import { handleServiceError } from "../utils/errorMap";
type ShowtimeControllerType = {
    getShowtimesByScreen : RequestHandler,
    getShowtimesByMovie : RequestHandler,
    getShowtimeById: RequestHandler,
    createShowtime : RequestHandler,
    updateShowtime : RequestHandler,
    deleteShowtime : RequestHandler,
    getShowtimeSeats : RequestHandler,
}

export const ShowtimeController : ShowtimeControllerType = {

    // Create showtime
    createShowtime : asyncHandler(async(req , res) => {
        const parsed = createShowtimeSchema.safeParse(req.body);
        if(!parsed.success) return sendError(res , 400, "Invalid Input", parsed.error.issues);
        const result = await ShowtimeService.createShowtime(req.client!.id , parsed.data);
        if ("error" in result) {
            if (typeof result.error === "string") return handleServiceError(res, result.error);
            return sendError(res, 500, "Unknown error");
        }
        return sendSuccess(res, 201, result.data , "Showtime created!");
    }),

    //get Showtimes By screen
    getShowtimesByScreen : asyncHandler(async(req , res) => {
        const {screenId} = req.params;
        if (typeof screenId !== "string" || !screenId.trim()) return sendError(res, 400, "Invalid Screen Id");
        return sendSuccess(res, 200, await ShowtimeService.getShowtimesByScreen(screenId));
    }),

    // get Showtimes By Id

    getShowtimesByMovie : asyncHandler(async(req , res) => {
        const {movieId} = req.params;
        if(typeof movieId !== "string" || !movieId.trim()) return sendError(res, 400,"Invalid Movie Id")
        return sendSuccess(res, 200, await ShowtimeService.getShowtimesByMovie(movieId))
    }),

    // get Showtimes By Id
     getShowtimeById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Showtime Id");
        const showtime = await ShowtimeService.getShowtimeById(id);
        if (typeof showtime === "undefined" || showtime === null) return sendError(res, 404, "Showtime not found");
        return sendSuccess(res, 200, showtime);
    }),
    // add to showtime.controller.ts
    getShowtimeSeats: asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Showtime Id");
        return sendSuccess(res, 200, await ShowtimeService.getShowtimeSeats(id));
    }),

    // update Showtime
    updateShowtime : asyncHandler(async (req , res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Showtime Id");
        const parsed = updatedShowtimeSchema.safeParse(req.body);
        if(!parsed.success) return sendError(res , 400, "Invalid Input", parsed.error.issues);
        const result = await ShowtimeService.updateShowtime(id, req.client!.id , parsed.data);
        if ("error" in result) {
            const err = result.error;
            if (typeof err === "string") return handleServiceError(res, result.error);
            return sendError(res, 500, "Unknown error");
        }
        return sendSuccess(res, 200, result.data, "Showtime updated");
    }),

    // delete Showtime
    deleteShowtime : asyncHandler(async(req, res) => {
        const { id } = req.params;
        if (typeof id !== "string" || !id.trim()) return sendError(res, 400, "Invalid Showtime Id");
        const result = await ShowtimeService.deleteShowtime(id, req.client!.id);
        if ("error" in result) {
            const err = result.error;
            if (typeof err === "string") return handleServiceError(res, result.error);
            return sendError(res, 500, "Unknown error");
        }
        return sendSuccess(res, 200, result.data, "Showtime deleted");
    })

}