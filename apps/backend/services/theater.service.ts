
import { db, Prisma } from "@repo/db";
export  const TheaterService = {
    createTheater: async (clientId: string, data: Omit<Prisma.TheaterCreateInput, "client">) => {
    return db.theater.create({
        data: { ...data, client: { connect: { id: clientId } } },
    });
},

updateTheater: async (id: string, clientId: string, data: Prisma.TheaterUpdateInput) => {
    const existing = await db.theater.findUnique({ where: { id } });
    if (!existing) return { error: "THEATER_NOT_FOUND" as const };
    if (existing.clientId !== clientId) return { error: "FORBIDDEN" as const };
    const updated = await db.theater.update({ where: { id }, data });
    return { data: updated };
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
    deleteTheater: async (id: string, clientId: string) => {
    const existing = await db.theater.findUnique({ where: { id } });
    if (!existing) return { error: "THEATER_NOT_FOUND" as const };
    if (existing.clientId !== clientId) return { error: "FORBIDDEN" as const };
    const deleted = await db.theater.delete({ where: { id } });
    return { data: deleted };
},
}