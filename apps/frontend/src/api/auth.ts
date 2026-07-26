import { apiClient } from "./client";
import type { ApiResponse, User } from "../types/types";

type AuthResponse = {user : User, token : string };


export const login = async( email : string , password : string) => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login" , {email , password});
    return res.data.data;
}   

export const register = async (data : {email : string, password: string, name : string }) => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/auth/register" ,data);
    return  res.data.data;
}