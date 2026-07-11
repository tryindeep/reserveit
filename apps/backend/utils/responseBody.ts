import type { Response } from "express";

export const sendSuccess = (
    res: Response, 
    statusCode : number, 
    data?:unknown ,
    message?: string
) => {
    return res.status(statusCode).json({success: true, data,message});
}

export const sendError = (
    res: Response,
    statusCode : number,
    message: string,
    error? : unknown
) => {
    return res.status(statusCode).json({success : false, message, error})
}