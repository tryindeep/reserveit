import { apiClient } from "./client";
import type { ApiResponse, Movie } from "../types/types";

export const getAllMovies = async () => {
    const res = await apiClient.get<ApiResponse<Movie[]>>("/movies");
    return res.data.data
}

export const getMovieById = async(id : string) => {
    const res = await apiClient.get<ApiResponse<Movie[]>>(`/movies/${id}`);
    res.data.data;
}
