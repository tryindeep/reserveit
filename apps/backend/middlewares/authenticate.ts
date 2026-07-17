import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { sendError } from "../utils/responseBody";

declare global {
    namespace Express {
        interface Request {
            user? : {userId : string , role : string};
            client? : {id : string , userId : string, status : string, businessName : string};
        }
    }
}

export const authenticate = (req : Request, res : Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader?.startsWith("Bearer ")) return sendError(res , 401, "Missing or Invalid authorization header");
    const token = authHeader.split(" ")[1]!; // ! trust me won't undefined 
    try {
        req.user = verifyToken(token);
        next();
    } catch (error) {
        return sendError(res, 401, "Invalid or expired token");
    }
};