import 'dotenv/config'
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"


export const hashPassword = (password : string) => {
    return bcrypt.hash(password, 10);
}
export const comparePassword = (password : string , hash : string) => {
    return bcrypt.compare(password, hash);
}

export const signToken = (payload : {
        userId:string;
        role: string
    }) => {
        return jwt.sign(payload, process.env.JWT_SECRET as string,{expiresIn : "7d"});
}

export const verifyToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; role: string }};