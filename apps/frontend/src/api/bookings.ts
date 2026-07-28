import type { ApiResponse, Booking } from "../types/types"
import { apiClient } from "./client"


export const holdSeats = async (showtimeId : string, seatIds : string[]) => {
    const res = await apiClient.post<ApiResponse<Booking>>("/bookings/hold" , {showtimeId , seatIds});
    return res.data.data;
}

export const getBookingById = async(id : string) => {
    const res = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return res.data.data;
}

export const getMyBookings = async () => {
    const res = await apiClient.get<ApiResponse<any[]>>("/bookings/me");
    return res.data.data;
}
