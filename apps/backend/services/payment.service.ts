import { db } from "@repo/db";
import Razorpay from "razorpay";
import crypto from "crypto"
import { BookingService } from "./booking.service";

const razorpay = new Razorpay ({
    key_id : process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_SECRET
})

export const PaymentService = {
    createOrder : async(bookingId : string , userId: string) => {
        const booking = await db.booking.findUnique({ where: { id: bookingId } });
        if (!booking) return { error: "BOOKING_NOT_FOUND" as const };
        if (booking.userId !== userId) return { error: "FORBIDDEN" as const };
        if (booking.status !== "PENDING") return { error: "NOT_PENDING" as const };

        const order = await razorpay.orders.create({
            amount : Math.round(booking.totalAmount * 100),
            currency : "INR",
            receipt : bookingId
        });

        // upsert means insert and update
        await db.payment.upsert({
            where : {bookingId},
            create : {bookingId , razorpayOrderId : order.id, amount : booking.totalAmount , 
                        currency : order.currency, keyId : process.env.RAZORPAY_KEY_ID},
            update : { razorpayOrderId : order.id , status : "CREATED"}
        });
        // BACKEND RETURNS
        return {data :  {orderId : order.id , amount : order.amount , currency : order.currency, keyId : process.env.RAZORPAY_KEY_ID }} 
    },
    // BACKEND CAPTURES
    verifySignature: (orderId: string, paymentId: string, signature: string) => {
        const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
        // Plain string comparison leaks timing information about how many characters matched, which is the textbook reason HMAC comparisons use constant-time equality. Both verifySignature and the webhook handler have this. Fix both with crypto.timingSafeEqual:
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
    confirmFromWebhook: async (razorpayOrderId: string, razorpayPaymentId: string) => {
        const payment = await db.payment.findUnique({ where: { razorpayOrderId } });
        if (!payment) return { error: "PAYMENT_NOT_FOUND" as const };

        if (payment.status !== "PAID") {
            await db.payment.update({ where: { id: payment.id }, data: { status: "PAID", razorpayPaymentId } });
        }

        const result = await BookingService.confirmBookingInternal(payment.bookingId);
        if ("error" in result && result.error === "NOT_PENDING") {
            return { data: payment }; // already confirmed earlier — fine
        }
        return result;
    },
}

// Customer
//    │
//    ▼
// Select Seats
//    │
//    ▼
// Hold Seats
//    │
//    ▼
// Booking (PENDING)
//    │
//    ▼
// Create Razorpay Order
//    │
//    ▼
// Customer Pays
//    │
//    ▼
// Razorpay
//    │
//    ▼
// Webhook
//    │
//    ▼
// Payment Confirmed
//    │
//    ▼
// Booking CONFIRMED
//    │
//    ▼
// Seats BOOKED