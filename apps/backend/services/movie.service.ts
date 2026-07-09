import { db, Prisma } from "@repo/db";

export const MovieService = {
    createMovie : async (data : Prisma.MovieCreateInput ) => {
        return db.movie.create({data})
    },
}