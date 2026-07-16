
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

    getAllTheaters : async(filters: { 
        city?: string; 
        pincode?: string; 
        name?: string; 
        limit: number; 
        offset: number; 
    }) => {
        const where: Prisma.TheaterWhereInput = {};

        if(filters.city) where.city = { equals: filters.city, mode: "insensitive" };
        if(filters.pincode) where.pincode = filters.pincode;
        if(filters.name) where.name = { contains: filters.name, mode: "insensitive" };

        const [theaters, total] = await Promise.all([
            db.theater.findMany({ 
                where, 
                orderBy : {createdAt : "desc"},
                take: filters.limit,
                skip: filters.offset,
            }),
            db.theater.count({ where }),
        ]);

        return {
            theaters,
            pagination: {
                total,
                limit: filters.limit,
                offset: filters.offset,
                hasMore: filters.offset + theaters.length < total,
            },
        };
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