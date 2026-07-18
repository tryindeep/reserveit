import z from "zod";

export const createShowtimeSchema = z.object({
    movieId : z.string().min(1),
    screenId : z.string().min(1),
    startTime: z.coerce.date(),
    price: z.number().positive()
});

export const updatedShowtimeSchema = z.object({
    startTime: z.coerce.date(),
    price: z.number().positive()
});