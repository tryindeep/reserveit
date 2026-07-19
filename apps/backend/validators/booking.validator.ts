import z from "zod";

export const holdBookingSchema = z.object({
    showtimeId : z.string().min(1),
    seatIds : z.array(z.string().min(1)).min(1)
})