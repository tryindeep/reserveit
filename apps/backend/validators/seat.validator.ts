import z from "zod";

export const generateSeatsSchema = z.object({
    rows:z.number().int().positive().max(26),
    seatsPerRow : z.number().int().positive(),
    seatType : z.enum(["STANDARD" , "PREMIUM", "RECLINER","VIP"]).default("STANDARD"),
});