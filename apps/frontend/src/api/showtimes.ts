import { apiClient } from "./client";
import type { ApiResponse, Showtime, ShowtimeSeat } from "../types/types";

export const getShowtimesByMovie = async(movieId : string) => {
    const res = await apiClient.get<ApiResponse<Showtime[]>>(`/movies/${movieId}/showtimes`);
    return res.data.data;
}

export const getShowtimeSeats =  async(showtimeId : string) => {
    const res = await apiClient.get<ApiResponse<ShowtimeSeat[]>>(`/showtimes/${showtimeId}/seats`);
    return res.data.data
}