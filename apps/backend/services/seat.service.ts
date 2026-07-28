import { db, Prisma } from "@repo/db"

export const SeatService = {
    generateSeats : async(screenId : string, clientId : string,{rows , seatsPerRow, seatType} : {rows: number , seatsPerRow: number , seatType : string
        }) => {
            const screen = await db.screen.findUnique({where : {id : screenId}, include : {theater: true}});
            if(!screen) return {error : "SCREEN_NOT_FOUND" as const }
            if(screen.theater.clientId !== clientId) return { error : "FORBIDDEN" as const}
            
            const existingCount = await db.seat.count({where : {screenId}});
            if(existingCount > 0) return { error: "SEATS_ALREADY_EXIST" as const };

            if (rows * seatsPerRow < screen.totalSeats) {
                return { error: "SEAT_LAYOUT_TOO_SMALL" as const };
            }

            const rowLetters =  Array.from({ length: rows }, 
                                    (_, i) => String.fromCharCode(65 + i));
            const seatData = rowLetters.flatMap((row) => 
                Array.from({ length: seatsPerRow }, (_, i) => ({ 
                    screenId, row, number: i + 1, seatType: seatType as any 
                }))
            ).slice(0, screen.totalSeats);
            await db.seat.createMany({data : seatData});
            const created = await db.seat.findMany({where : {screenId}, orderBy: [{row : "asc"}, {number : "asc"}]})
            return {data: created}

    },
    getSeatsByScreen : async(screenId: string) => {
            return await db.seat.findMany({ where: { screenId }, orderBy: [{ row: "asc" }, { number: "asc" }] });
    },
}
