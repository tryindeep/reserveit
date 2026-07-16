import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendError, sendSuccess } from "../utils/responseBody";
import z from "zod";
import { ScreenService } from "../services/screen.service";


const createScreenSchema = z.object({
    name: z.string().min(1).max(100),
    totalSeats: z.number().int().positive(),
    screenType: z.enum(["STANDARD", "IMAX", "FOUR_DX", "GOLD_CLASS", "RECLINER"]).optional(),
});
const updateScreenSchema = createScreenSchema.partial();

type ScreenControllerType = {
    createScreen : RequestHandler
}

export const ScreenController : ScreenControllerType = {

    // Create Screen 
    createScreen: asyncHandler(async (req, res) => {
            const { theaterId } = req.params;
            if (typeof theaterId !== "string" || !theaterId.trim()) {
                return sendError(res, 400, "Invalid Theater Id");
            }
            const parsed = createScreenSchema.safeParse(req.body);
            if (!parsed.success) {
                return sendError(res, 400, "Invalid Input", parsed.error.issues);
            }
            const screen = await ScreenService.createScreen(theaterId, parsed.data);
            return sendSuccess(res, 201, screen, "Screen created");
    }),
}  