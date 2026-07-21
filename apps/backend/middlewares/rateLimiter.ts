import type { Request, Response , NextFunction } from "express";
import { redis } from "../utils/redis";
import { sendError } from "../utils/responseBody";

// {5,60} 5 request in 60 secs
export const rateLimiter = (max : number , windowSeconds : number) =>  {
    return async (req : Request , res : Response, next : NextFunction) => {
        const identifier = req.user?.userId ?? req.ip; // req.ip = 192.168.1.10
        // create the redis key 
        const key = `rate-limit:${req.baseUrl}${req.path}:${identifier}`;
        const count = await redis.incr(key);
        if(count === 1) await redis.expire(key, windowSeconds);

        if(count > max) {
            return sendError(res, 429, "Too many requests, please slow down");
        }
        next();
    };
}