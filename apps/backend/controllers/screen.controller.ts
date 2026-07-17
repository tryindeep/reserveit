import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendError, sendSuccess } from "../utils/responseBody";
import z from "zod";
import { ScreenService } from "../services/screen.service";
import { createScreenSchema, updateScreenSchema } from "../validators/screen.validator";



type ScreenControllerType = {
    createScreen : RequestHandler,
    getScreensByTheater : RequestHandler,
    getScreenById : RequestHandler,
    updateScreen : RequestHandler,
    deleteScreen : RequestHandler

}

export const ScreenController : ScreenControllerType = {

    createScreen : asyncHandler(async(req, res) => {
        const {theaterId} = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400 , "Invalid TheaterId")
        }
        const parsed = createScreenSchema.safeParse(req.body);
        if(!parsed.success) {
            return sendError(res , 400, "Invalid Input", parsed.error.issues);
        }
        const result = await ScreenService.createScreen(theaterId,req.client!.id, parsed.data);
        if("error" in result) {
            if(result.error === "THEATER_NOT_FOUND") return sendError(res, 404, "Theater not found");
            if(result.error === "FORBIDDEN") return sendError(res, 403 , "You do not own this theater");
        }
        return sendSuccess(res , 201, result.data , "Screen Created!")
    }),
    getScreensByTheater : asyncHandler(async(req, res) => {
        const {theaterId} = req.params;
        if(typeof theaterId !== "string" || !theaterId.trim()){
            return sendError(res , 400 , "Invalid TheaterId")
        }
        const result = await ScreenService.getScreensByTheater(theaterId);
        return sendSuccess(res, 200, result)
    }),
    getScreenById : asyncHandler(async(req, res) => {
        const {id} = req.params;
        if(typeof id !== "string" || !id.trim()){
            return sendError(res , 400 , "Invalid ScreenId")
        }
        const screen = await ScreenService.getScreenById(id);
        if (!screen) return sendError(res, 404, "Screen not Found");
        return sendSuccess(res,200,screen)
    }),
    updateScreen : asyncHandler(async(req, res) => {
        const {id} = req.params;
        if(typeof id !== "string" || !id.trim()){
            return sendError(res , 400 , "Invalid ScreenId")
        }
        const parsed = updateScreenSchema.safeParse(req.body);
        if(!parsed.success) {
            return sendError(res , 400, "Invalid Input", parsed.error.issues);
        }
        const result = await ScreenService.updateScreen(id,req.client!.id, parsed.data);
        if("error" in result) {
            if(result.error === "SCREEN_NOT_FOUND") return sendError(res, 404, "Screen not found");
            if(result.error === "FORBIDDEN") return sendError(res, 403 , "You do not own this screen");
        }
        return sendSuccess(res, 200, result.data, "Screen Updated!")
    }),
    deleteScreen : asyncHandler(async(req, res) => {
        const {id} = req.params;
        if(typeof id !== "string" || !id.trim()){
            return sendError(res , 400 , "Invalid ScreenId")
        }
        const result = await ScreenService.deleteScreen(id,req.client!.id);
        if("error" in result) {
            if(result.error === "SCREEN_NOT_FOUND") return sendError(res, 404, "Screen not found");
            if(result.error === "FORBIDDEN") return sendError(res, 403 , "You do not own this screen");
        }
        return sendSuccess(res, 200, result.data, "Screen Deleted Successfully!")
    }),

}  