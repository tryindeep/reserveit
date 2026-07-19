import { db , Prisma } from "@repo/db"


const HOLD_DURATION_MS = 5 * 60_000;

export const BookingService = {
     holdSeats: async (userId: string, showtimeId: string, seatIds: string[]) => {
        const showtime = await db.showtime.findUnique({ where: { id: showtimeId } });
        if (!showtime) return { error: "SHOWTIME_NOT_FOUND" as const };

        const showtimeSeats = await db.showtimeSeat.findMany({
        where: { showtimeId, seatId: { in: seatIds } },
        });
        if (showtimeSeats.length !== seatIds.length) return { error: "INVALID_SEATS" as const };

        const alreadyTaken = showtimeSeats.filter((s) => s.status !== "AVAILABLE");
        if (alreadyTaken.length > 0) return { error: "SEAT_ALREADY_TAKEN" as const };

        const now = new Date();
        const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
        const totalAmount = showtimeSeats.reduce((sum, s) => sum + s.price, 0);

        try {
        const booking = await db.$transaction(async (tx) => {
            const created = await tx.booking.create({
            data: { userId, showtimeId, status: "PENDING", totalAmount, expiresAt },
            });
            // Optimistic Concurrency Control.
            for (const seat of showtimeSeats) {
            const updateResult = await tx.showtimeSeat.updateMany({
                where: { id: seat.id, status: "AVAILABLE" },
                data: { status: "LOCKED" },
            });
            if (updateResult.count === 0) {
                throw { code: "RACE_LOST" };
            }
            }

            await tx.bookingSeat.createMany({
            data: showtimeSeats.map((s) => ({
                bookingId: created.id,
                showtimeSeatId: s.id,
                seatId: s.seatId,
            })),
            });

            return created;
        });

        return { data: booking }
        // P2002 Prisma unique constraint error.
        } catch (err: any) {
        if (err.code === "P2002" || err.code === "RACE_LOST") return { error: "SEAT_ALREADY_TAKEN" as const };
        throw err;
        }
    },
    confirmBooking : async(bookingId : string, userId : string) => {
        const booking = await  db.booking.findUnique({where : {id : bookingId}})
        if(!booking) return { error: "BOOKING_NOT_FOUND" as const };
        if(booking.userId !== userId) return { error: "FORBIDDEN" as const };
        if(booking.status !== "PENDING") return { error: "NOT_PENDING" as const };

        if(booking.expiresAt < new Date()){
            await releaseBookingSeats(bookingId);
            await db.booking.update({where : {id : bookingId} , data : {status : "EXPIRED"}});
            return { error: "EXPIRED" as const };
        }
        const updated = await db.$transaction(async(tx) => {
            await tx.booking.update({where : {id : bookingId} , data : {status : "CONFIRMED"}});
            await tx.showtimeSeat.updateMany({
                where : { bookingSeat : {bookingId}},
                data : {status : "BOOKED"}
            })
            return booking;
        });
        return {data : updated}
    },
    cancelBooking : async(bookingId : string, userId : string) => {
        const booking = await db.booking.findUnique({where : {id : bookingId}});;
        if(!booking) return { error: "BOOKING_NOT_FOUND" as const };
        if(booking.userId !== userId) return { error: "FORBIDDEN" as const };
        if(booking.status !== "PENDING" && booking.status !== "CONFIRMED") return { error: "NOT_CANCELLABLE" as const };

        await releaseBookingSeats(bookingId);
        const updated = await db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
        return { data : updated};
    },
    getBookingById : async(id : string, userId : string) => {
        const booking = await db.booking.findUnique({
            where : {id},
            include : {
                bookingSeats : {include : {seat : true}},
                showtime : {include : { movie : true , screen : { include : {theater : true}}}},
            }
        });
        if(!booking)  return { error: "BOOKING_NOT_FOUND" as const };
        if (booking.userId !== userId) return { error: "FORBIDDEN" as const };
        return { data: booking }
    },

    // important
    expireStaleBookings: async() => {
        const stale = await db.booking.findMany({where : {status : "PENDING", expiresAt : {lt : new Date()}}});
        for(const booking of stale){
            await releaseBookingSeats(booking.id);
        }
        if(stale.length > 0){
            await db.booking.updateMany({
                where : {id : {in : stale.map((b) => b.id)}},
                data : { status : "EXPIRED"}
            });
        }
        return stale.length;
    },
};

async function releaseBookingSeats(bookingId:string) {
    await db.showtimeSeat.updateMany({
        where: {bookingSeat : {bookingId}},
        data: {status : "AVAILABLE"}
    });
}


// COMPLETED Booking LIfe circle 

// User selects seats
//         │
//         ▼
// holdSeats()
//         │
//         ▼
// Booking created
// Status = PENDING
// Seats = LOCKED
//         │
//         ▼
// User pays successfully
//         │
//         ▼
// confirmBooking()
//         │
//         ▼
// Booking = CONFIRMED
// Seats = BOOKED


// If the user cancels:
// Booking = CANCELLED
// Seats = AVAILABLE

// If the user never pays:

// Booking expires after 5 minutes
//         │
//         ▼
// expireStaleBookings()
//         │
//         ▼
// Booking = EXPIRED
// Seats = AVAILABLE

// Key concepts demonstrated in this code
// Transactions ($transaction): Ensure related database operations either all succeed or all fail together.
// Optimistic concurrency control: updateMany with status: "AVAILABLE" prevents two users from locking the same seat simultaneously.
// Seat state machine:
// AVAILABLE → LOCKED → BOOKED
// LOCKED → AVAILABLE (cancel/expire)
// Booking state machine:
// PENDING → CONFIRMED
// PENDING → EXPIRED
// PENDING/CONFIRMED → CANCELLED
// Authorization checks: Ensures only the booking owner can confirm, cancel, or view the booking.
// Expiration mechanism: Prevents abandoned bookings from blocking seats indefinitely.

// Overall, this is a solid backend pattern for handling movie ticket reservations where concurrency and data consistency are critical.