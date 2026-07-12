
import { db, Prisma } from "@repo/db";
export  const TheaterService = {
    createTheater : async(data : Prisma.TheaterCreateInput) => {
        return db.theater.create({data})
    },
    updateTheater : async(id : string , data : Prisma.TheaterUpdateInput) => {
        const existingTheater = await db.theater.findUnique({
            where: { id }
        })
        if(!existingTheater) return null;
        return db.theater.update({where:{id}, data});
    },
    getTheaterById: async (id: string) => {
    return db.theater.findUnique({ where: { id } });
    },
    getAllTheaters : async() => {
        return db.theater.findMany({orderBy : {createdAt : "desc"}})
    },
    fetchTheater: async(name : string) => {
        return db.theater.findMany({
            where: {
                name: {
                    contains: name,
                    mode: "insensitive",
                },
            },
            orderBy: { createdAt: "desc" },
        })
    },
    deleteTheater : async(id:string) => {
        const existingTheater = await db.theater.findUnique({ where: { id } });
        if (!existingTheater) return null;
        return db.theater.delete({where:{id}});
    }
}