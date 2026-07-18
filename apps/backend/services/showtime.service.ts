import { db } from "@repo/db"
import { date } from "zod";

const DEFAULT_DURATION_MINS = 150;

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
        
        const created = await db.showtime.create({
            data : { movieId : data.movieId , screenId : data.screenId , startTime : data.startTime, endTime, price: data.price},
        });
        return {data : created}
    },

    getShowtimesByScreen : async (screenId : string) =>{
        db.showtime.findMany({ where : {
            screenId
        }, orderBy : {startTime : "asc"}, include : {movie : true}})
    },
    getShowtimesByMovie : async (movieId : string) =>{
        db.showtime.findMany({where : {movieId , startTime : {gte : new Date()}},
            orderBy: {startTime: "asc"},
            include : {screen : { include : { theater : true}}}
        })
    },
    getShowtimeById : async (id: string) =>{
         db.showtime.findUnique({ where: { id }, include: { movie: true, screen: { include: { theater: true } } } })
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

        if(data.startTime){
            const durationMins = existing.movie.durationMins ?? DEFAULT_DURATION_MINS;
            const endTime = new Date(newStart.getTime() + durationMins * 60_000);
            const overlapping = await db.showtime.findFirst({
                where: { screenId: existing.screenId, id: { not: id }, AND: [{ startTime: { lt: endTime } }, { endTime: { gt: newStart } }] },
            })
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