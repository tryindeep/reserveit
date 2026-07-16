import { db, Prisma } from "@repo/db";

export const theaterMovieService = {

    // ADD MOVIE TO THE THEATER 
    addMovieToTheater : async(theaterId : string, movieId: string) => {

        const theater = await db.theater.findUnique({where: {id : theaterId}})
        if(!theater) return {
            error : "THEATER_NOT_FOUND" as const
        };

        const movie = await db.movie.findUnique({where: {id : movieId}})
        if(!movie) return {
            error : "MOVIE_NOT_FOUND" as const
        };

        const existing = await db.theaterMovie.findUnique({
            where : { theaterId_movieId : {theaterId , movieId}} 
        });

        if(existing){
            return {error : "ALREADY_EXISTS" as const};
        }

        const created = await db.theaterMovie.create({
            data : { theaterId , movieId}
        });
        return {data : created};
    },
    // bulk Add Movies To Theater
    bulkAddMoviesToTheater: async (theaterId: string, movieIds: string[]) => {
    const theater = await db.theater.findUnique({ where: { id: theaterId } });
    if (!theater) return { error: "THEATER_NOT_FOUND" as const };

    const results = await Promise.all(
        movieIds.map(async (movieId) => {
        const movie = await db.movie.findUnique({ where: { id: movieId } });
        if (!movie) return { movieId, status: "MOVIE_NOT_FOUND" as const };

        const existing = await db.theaterMovie.findUnique({
            where: { theaterId_movieId: { theaterId, movieId } },
        });
        if (existing) return { movieId, status: "ALREADY_EXISTS" as const };

        const created = await db.theaterMovie.create({ data: { theaterId, movieId } });
        return { movieId, status: "ADDED" as const, data: created };
        })
    );

    return { data: results };
    },
    // REMOVE MOVIE FROM THE THEATER
    removeMovieFromTheater : async( theaterId : string, movieId : string) => {
        const existing = await  db.theaterMovie.findUnique({
            where : {theaterId_movieId : {theaterId , movieId}}
        });
        if(!existing) return null;

        return db.theaterMovie.delete({
            where:{theaterId_movieId : {theaterId, movieId}}
        });
    },

    // GET ALL MOVIES RUNNING IN A THEATER
    getMoviesByTheater : async(theaterId : string) => {
        const entries = await db.theaterMovie.findMany({
            where : {theaterId},
            include : {movie: true},
            orderBy : {addedAt: "desc"}
        })
        return entries.map((e) => e.movie);
    },

    //GET ALL THEATERS SHOWING A MOVIE
    getTheatersByMovie : async(movieId : string) => {
        const entries = await db.theaterMovie.findMany({
            where : {movieId},
            include: {theater : true},
            orderBy : {addedAt : "desc"}
        })
        return entries.map((e) => e.theater);
    }
}