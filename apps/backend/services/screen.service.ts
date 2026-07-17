import {db, Prisma} from "@repo/db";
import { sendError } from "../utils/responseBody";

export const ScreenService = {
    createScreen : async(
        theaterId : string,
        clientId : string,
        data : {
            name : string,
            totalSeats : number,
            screenType?: Prisma.ScreenCreateInput["screenType"]
        }
        ) => {
            const theater = await db.theater.findUnique({
            where : {id : theaterId}
        })
        if(!theater) return {error : "THEATER_NOT_FOUND" as const};
        if(theater?.clientId !== clientId)  return {error : "FORBIDDEN" as const};
        const created = await db.screen.create({data : {
            ...data , theater : {
                connect : {
                    id: theaterId
                }
            }
        }})
        return {data : created}
    },
    getScreensByTheater : async(theaterId : string) => {
        const screens = await db.screen.findMany({
            where : {
                theaterId
            },
            orderBy : {
                createdAt :"desc"
            }
        })
        return screens;
    },
    getScreenById : async(id:string) => {
       return await  db.screen.findUnique({
        where : {
            id
        }
       })
    },
    updateScreen : async(id: string , clientId : string, data : Prisma.ScreenUpdateInput) => {
        const existing = await db.screen.findUnique({
            where : {id},include : { theater : true}
        })
        if(!existing) return { error: "SCREEN_NOT_FOUND" as const };
        if(existing.theater.clientId !== clientId)  return {error : "FORBIDDEN" as const};
        const updated = await db.screen.update({where :{id},data })
        return {data : updated}
    },
    deleteScreen : async(id: string , clientId : string) => {
        const existing = await db.screen.findUnique({
            where : {id},include : { theater : true}
        })
        if(!existing) return { error: "SCREEN_NOT_FOUND" as const };
        if(existing.theater.clientId !== clientId)  return {error : "FORBIDDEN" as const};
        const deleted = await db.screen.delete({where :{id}})
        return {data : deleted}
    },
}