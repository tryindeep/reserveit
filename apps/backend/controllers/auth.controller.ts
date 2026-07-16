import type { RequestHandler } from "express"
import { asyncHandler } from "../utils/asyncHandler"
import { sendError, sendSuccess } from "../utils/responseBody"
import { loginSchema, registerSchema, registerClientSchema } from "../validators/auth.validator"
import { AuthService } from "../services/auth.service"


type authControllerType = {
    register : RequestHandler,
    registerClient : RequestHandler,
    login : RequestHandler
}
export const authController : authControllerType = {
    // register as a CUSTOMER 
    register :  asyncHandler(async(req , res) => {
        const parsed = registerSchema.safeParse(req.body);
        if(!parsed.success){
            return sendError(res, 400 , "Invalid Input" , parsed.error.issues)
        }
        const result = await AuthService.register(parsed.data);
        if("error" in result){
            return sendError( res, 409, "An Account with this email already exists")
        }
        return sendSuccess(res,201,result.data, "Registered SuccessFully")
    }),

    // REGISTER as a CLIENT
    registerClient :  asyncHandler(async(req , res) => {
        const parsed = registerClientSchema.safeParse(req.body);
        if(!parsed.success){
            return sendError(res, 400 , "Invalid Input" , parsed.error.issues)
        }
        const clientData = { ...parsed.data, phone: parsed.data.phone ?? "" };
        const result = await AuthService.registerClient(clientData);
        if ("error" in result) return sendError(res, 409, "An account with this email already exists");
        return sendSuccess(res, 201, result.data, "Client account created, pending admin approval");
    }),
    // logging In
    login :  asyncHandler(async(req , res) => {
        const parsed = loginSchema.safeParse(req.body);
        if(!parsed.success){
            return sendError(res, 400 , "Invalid Input" , parsed.error.issues)
        }
        const result = await AuthService.login(parsed.data.email , parsed.data.password);
        if ("error" in result) return sendError(res, 401, "Invalid Email or Password");
        return sendSuccess(res, 200, result.data, "Logged in SuccessFully");
    }),
};