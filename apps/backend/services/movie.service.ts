import { db, Prisma } from "@repo/db";

export const MovieService = {
    createMovie : async (data : Prisma.MovieCreateInput ) => {
        return db.movie.create({data})
    },
    getAllMovies : () => {
        return db.movie.findMany({orderBy : {createdAt : "desc"}})
    },
    getMovieById : async (id : string) => {
        return db.movie.findUnique({where :{id} })
    },
    updateMovie : async ( id : string , data : Prisma.MovieUpdateInput) => {
        const existingMovie = await db.movie.findUnique({where: {id}});
        if(!existingMovie) return null;
        return db.movie.update({where:{id} , data});
    },
    deleteMovie : async(id:string) => {
      return db.movie.delete({where:{id}});
    }
}