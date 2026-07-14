import type { Request , Response, NextFunction } from "express";
import { sendError } from "./responseBody";

export const errorHandler = (err : Error , req : Request , res : Response , next : NextFunction) => {
    console.error("Unhandled Error : ", err);
    return sendError(res , 500, "Internal Server Error");
}