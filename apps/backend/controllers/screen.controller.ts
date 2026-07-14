import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendError, sendSuccess } from "../utils/responseBody";
import z from "zod";
import { ScreenService } from "../services/screen.service";


const createScreenSchema = z.object({
    name : z.string().min(1).max(100),
    screenNumber : z.number().int().positive(),
    capacity : z.number().int().positive()
})

const updateScreenSchema = createScreenSchema.partial();

type ScreenControllerType = {
    createScreen : RequestHandler
}

export const ScreenController : ScreenControllerType = {

    // Create Screen 
    createScreen : asyncHandler(async(req , res) => {
        const { theaterId } = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400, "Invalid Theater Id")
        }
        const parsed = createScreenSchema.safeParse(req.body);

        if(!parsed.success){
            return sendError(res, 400,"Invalid Input" , parsed.error.issues);
        }

        const screenPayload = {
            ...parsed.data,
            totalSeats: parsed.data.capacity,
            theater: {
                connect: { id: theaterId },
            },
        };

        const screen = await ScreenService.createScreen(theaterId, screenPayload);
        return sendSuccess(res, 201, screen , "Screen created", );
    }),
}   l