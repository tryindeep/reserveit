import type { ApiResponse } from "../types/types"
import { apiClient } from "./client"



type OrderResponse = {
    orderId : string,
    amount : number,
    currency : string,
    keyId : string
}

export const createOrder = async(bookingId : string) => {
    const res = await apiClient.post<ApiResponse<OrderResponse>>(`/bookings/${bookingId}/create-order`);
    return res.data.data;
}

export const verifyPayment = async (data : {
    razorpay_order_id : string,
    razorpay_payment_id : string,
    razorpay_signature : string
}) => {
    const res = await apiClient.post<ApiResponse<null>>("/payments/verify", data);
    return res.data.data;
}