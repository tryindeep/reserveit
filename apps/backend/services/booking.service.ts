import { db , Prisma } from "@repo/db"
import { redis } from "../utils/redis";

const HOLD_DURATION_SECONDS = 300;
const HOLD_DURATION_MS = HOLD_DURATION_SECONDS * 1000;

export const BookingService = {
    getBookingsByUser: async (userId: string) => {
        return db.booking.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                bookingSeats: { include: { seat: true } },
                showtime: { include: { movie: true, screen: { include: { theater: true } } } },
            },
        });
    },
     holdSeats: async (userId: string, showtimeId: string, seatIds: string[]) => {
        const showtime = await db.showtime.findUnique({ where: { id: showtimeId } });
        if (!showtime) return { error: "SHOWTIME_NOT_FOUND" as const };

        // Redis lock — fast pre-check before touching Postgres at all
        const lockKeys = seatIds.map((seatId) => `seat-lock:${showtimeId}:${seatId}`);
        const acquiredKeys : string[] = [];

        for(const key of lockKeys){
            const acquired = await redis.set(key , userId, "EX" , 300, "NX");
            if(!acquired){
                if(acquiredKeys.length > 0) await redis.del(...acquiredKeys);
                return {error : "SEAT_ALREADY_TAKEN" as const}
            }
            acquiredKeys.push(key);
        }
        const showtimeSeats = await db.showtimeSeat.findMany({
        where: { showtimeId, seatId: { in: seatIds } },
        });
        if (showtimeSeats.length !== seatIds.length){
            await redis.del(...acquiredKeys); // release locks, request is invalid
            return { error: "INVALID_SEATS" as const };
        } 

        const alreadyTaken = showtimeSeats.filter((s) => s.status !== "AVAILABLE");
        if (alreadyTaken.length > 0) {
            await redis.del(...acquiredKeys);
            return { error: "SEAT_ALREADY_TAKEN" as const };
        }

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
            await redis.del(...acquiredKeys); // Postgres lost the race — release Redis locks too
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
            const b = await tx.booking.update({where : {id : bookingId} , data : {status : "CONFIRMED"}});
            await tx.showtimeSeat.updateMany({
                where : { bookingSeat : {bookingId}},
                data : {status : "BOOKED"}
            })
            return b;
        });
        await releaseSeatLocks(bookingId)
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
    confirmBookingInternal : async(bookingId : string) => {
        const booking = await db.booking.findUnique({ where: { id: bookingId } });
        if (!booking) return { error: "BOOKING_NOT_FOUND" as const };
        if (booking.status !== "PENDING") return { error: "NOT_PENDING" as const };

        const updated = await db.$transaction(async(tx)=> {
            const b = await tx.booking.update({where : {id: bookingId}, data : {status : "CONFIRMED"}});
            await tx.showtimeSeat.updateMany({where : {bookingSeat : {bookingId}}, data: {status : "BOOKED"}});
            return b;
        });
        await releaseSeatLocks(bookingId); 
        return {data : updated}
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

// Releases the Postgres seat status AND the Redis lock together
async function releaseBookingSeats(bookingId:string) {
    await db.showtimeSeat.updateMany({
        where: {bookingSeat : {bookingId}},
        data: {status : "AVAILABLE"}
    });
       await releaseSeatLocks(bookingId); 
}
// / Just the Redis half — used when Postgres state doesn't need to change (e.g. booking just confirmed)
async function releaseSeatLocks(bookingId :string){
    const bookingSeats = await db.bookingSeat.findMany({
        where : {bookingId},
        include: {showtimeSeat : true}
    });
    const keys = bookingSeats.map((bs) => `seat-lock:${bs.showtimeSeat.showtimeId}:${bs.seatId}`);
    if(keys.length > 0) await redis.del(...keys);
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



// Customer
//     │
//     │ Select seats
//     ▼
// BookingService.holdSeats()
//     │
//     ├── Create Booking (PENDING)
//     ├── Create BookingSeat rows
//     └── Lock ShowtimeSeat rows
//     │
//     ▼
// Frontend
//     │
//     │ POST /create-order
//     ▼
// PaymentService.createOrder()
//     │
//     ├── Validate booking
//     ├── Create Razorpay Order
//     └── Save Payment (CREATED)
//     │
//     ▼
// Razorpay Checkout
//     │
//     │ Customer pays
//     ▼
// Razorpay
//     ├── Returns payment details to frontend
//     └── Sends signed webhook to backend
//                │
//                ▼
// handleRazorpayWebhook()
//                │
//                ├── Verify webhook signature
//                ├── Mark Payment = PAID
//                └── BookingService.confirmBookingInternal()
//                            │
//                            ├── Booking → CONFIRMED
//                            └── ShowtimeSeat → BOOKED
