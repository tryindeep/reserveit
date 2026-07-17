import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/responseBody";

export const authorize = (...allowedRoles: string[]) => (req : Request , res : Response , next : NextFunction ) => {
    if(!req.user || !allowedRoles.includes(req.user.role)) {
        return sendError(res , 403 , "You are not authorized to perform this action");
    }
    next();
} 