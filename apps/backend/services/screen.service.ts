import {db, Prisma} from "@repo/db";

export const ScreenService = {
    createScreen : async (theaterId : string , data :Prisma.ScreenCreateInput) => {
        return db.screen.create({
            data : {
                ...data, 
                theater : {
                    connect :{
                        id : theaterId
                    }
                }
            }
        });
    }
}