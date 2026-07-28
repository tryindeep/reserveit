import { db } from "@repo/db"
const DEFAULT_DURATION_MINS = 150;
const SEAT_TYPE_MULTIPLIER: Record<string, number> = {
    STANDARD: 1,
    PREMIUM: 1.2,
    RECLINER: 1.5,
    VIP: 1.75,
};

export const ShowtimeService = {

     createShowtime : async (clientId : string, data : {
        movieId : string , 
        screenId : string,
        startTime : Date,
        price : number
     }) => {
        const screen = await db.screen.findUnique({where : {id : data.screenId}, include : {theater : true}});
        if(!screen) return {error : "SCREEN_NOT_FOUND" as const };
        if(screen.theater.clientId !== clientId ) return { error: "FORBIDDEN" as const }

        const movie = await db.movie.findUnique({where : { id: data.movieId }});
        if(!movie) return { error: "MOVIE_NOT_FOUND" as const };

        const isAssignedToTheater = await db.theaterMovie.findUnique({
            where: { theaterId_movieId: { theaterId: screen.theaterId, movieId: data.movieId } },
        });
        if (!isAssignedToTheater) return { error: "MOVIE_NOT_ASSIGNED_TO_THEATER" as const };

        const durationMins = movie.durationMins ?? DEFAULT_DURATION_MINS;
        const endTime = new Date(data.startTime.getTime() + durationMins * 60_000);

        const overlapping = await db.showtime.findFirst({
            where :{
                screenId : data.screenId ,
                AND : [{
                    startTime: { lt : endTime}, endTime : {gt : data.startTime}}]
            }
        });
        if(overlapping) return { error: "OVERLAP" as const };
        
        const created = await db.$transaction(async (tx) => {
            const showtime = await tx.showtime.create({
                data : { movieId : data.movieId , screenId : data.screenId , startTime : data.startTime, endTime, price: data.price},
            });
            const seats = await tx.seat.findMany({ where: { screenId: data.screenId } });
            if (seats.length === 0) throw new Error("SCREEN_HAS_NO_SEATS");
            await tx.showtimeSeat.createMany({
                data: seats.map((seat) => ({
                    showtimeId: showtime.id,
                    seatId: seat.id,
                    price: roundPrice(data.price * (SEAT_TYPE_MULTIPLIER[seat.seatType] ?? 1)),
                })),
            });
            return showtime;
        });
        return {data : created}
    },

    getShowtimesByScreen : async (screenId : string) =>{
        return db.showtime.findMany({ where : {
            screenId
        }, orderBy : {startTime : "asc"}, include : {movie : true}})
    },
    getShowtimesByMovie : async (movieId : string) =>{
        return db.showtime.findMany({where : {movieId , startTime : {gte : new Date()}},
            orderBy: {startTime: "asc"},
            include : {screen : { include : { theater : true}}}
        })
    },
    getShowtimeById : async (id: string) =>{
        return db.showtime.findUnique({ where: { id }, include: { movie: true, screen: { include: { theater: true } } } })
    },
    // add to showtime.service.ts
    getShowtimeSeats: async (showtimeId: string) => {
        // Backfill inventories for showtimes created before seat maps were generated.
        const existing = await db.showtimeSeat.count({ where: { showtimeId } });
        if (existing === 0) await createSeatInventory(showtimeId);
        return db.showtimeSeat.findMany({
            where: { showtimeId },
            include: { seat: true },
            orderBy: [{ seat: { row: "asc" } }, { seat: { number: "asc" } }],
        });
    },

    updateShowtime : async (id : string , clientId : string , data : {
            startTime? : Date;
            price?: number 
        }) =>{
        const existing = await db.showtime.findUnique({ where: { id }, include: { screen: { include: { theater: true } }, movie: true } });
        if(!existing)  return { error: "SHOWTIME_NOT_FOUND" as const };
        if(existing.screen.theater.clientId !== clientId) return { error: "FORBIDDEN" as const };

        let endTime = existing.endTime;
        const newStart = data.startTime ?? existing.startTime;

        if (data.startTime) {
            const durationMins = existing.movie.durationMins ?? DEFAULT_DURATION_MINS;
            endTime = new Date(newStart.getTime() + durationMins * 60_000);  
            const overlapping = await db.showtime.findFirst({
                where: { screenId: existing.screenId, id: { not: id }, AND: [{ startTime: { lt: endTime } }, { endTime: { gt: newStart } }] },
            });
            if (overlapping) return { error: "OVERLAP" as const };
        }
        const updated = await db.showtime.update({ where: { id }, data: { startTime: newStart, endTime, price: data.price ?? existing.price } });
        return { data: updated };
    },

    deleteShowtime : async (id: string , clientId : string) =>{
         const existing = await db.showtime.findUnique({ where: { id }, include: { screen: { include: { theater: true } } } });
        if (!existing) return { error: "SHOWTIME_NOT_FOUND" as const };
        if (existing.screen.theater.clientId !== clientId) return { error: "FORBIDDEN" as const };
        return { data: await db.showtime.delete({ where: { id } }) };
    },

}

const roundPrice = (price: number) => Math.round(price * 100) / 100;

async function createSeatInventory(showtimeId: string) {
    await db.$transaction(async (tx) => {
        const showtime = await tx.showtime.findUnique({ where: { id: showtimeId } });
        if (!showtime) return;
        const seats = await tx.seat.findMany({ where: { screenId: showtime.screenId } });
        if (seats.length === 0) return;
        await tx.showtimeSeat.createMany({
            data: seats.map((seat) => ({
                showtimeId,
                seatId: seat.id,
                price: roundPrice(showtime.price * (SEAT_TYPE_MULTIPLIER[seat.seatType] ?? 1)),
            })),
            skipDuplicates: true,
        });
    });
}
