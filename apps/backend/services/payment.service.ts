import { db } from "@repo/db";
import Razorpay from "razorpay";
import crypto from "crypto";
import { BookingService } from "./booking.service";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const PaymentService = {
  createOrder: async (bookingId: string, userId: string) => {
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { error: "BOOKING_NOT_FOUND" as const };
    if (booking.userId !== userId) return { error: "FORBIDDEN" as const };
    if (booking.status !== "PENDING") return { error: "NOT_PENDING" as const };

    const order = await razorpay.orders.create({ amount: Math.round(booking.totalAmount * 100), currency: "INR", receipt: bookingId });
    await db.payment.upsert({
      where: { bookingId },
      create: { bookingId, razorpayOrderId: order.id, amount: booking.totalAmount, status: "CREATED" },
      update: { razorpayOrderId: order.id, status: "CREATED" },
    });
    return { data: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID } };
  },
  verifySignature: (orderId: string, paymentId: string, signature: string) => {
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  },
  confirmAfterSignature: async (razorpayOrderId: string, razorpayPaymentId: string, userId: string) => {
    const payment = await db.payment.findUnique({ where: { razorpayOrderId }, include: { booking: true } });
    if (!payment) return { error: "PAYMENT_NOT_FOUND" as const };
    if (payment.booking.userId !== userId) return { error: "FORBIDDEN" as const };
    return confirmPayment(payment.id, payment.bookingId, razorpayPaymentId);
  },
  confirmFromWebhook: async (razorpayOrderId: string, razorpayPaymentId: string) => {
    const payment = await db.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment) return { error: "PAYMENT_NOT_FOUND" as const };
    return confirmPayment(payment.id, payment.bookingId, razorpayPaymentId);
  },
};

async function confirmPayment(paymentId: string, bookingId: string, razorpayPaymentId: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "BOOKING_NOT_FOUND" as const };
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") return { error: "NOT_PENDING" as const };

  // A callback and the webhook may race. A booking already confirmed only needs
  // its payment record updated; any other non-pending booking is not chargeable.
  if (booking.status === "CONFIRMED") {
    const payment = await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", razorpayPaymentId } });
    return { data: payment };
  }

  const result = await BookingService.confirmBookingInternal(bookingId);
  if ("error" in result) return result;
  const payment = await db.payment.update({ where: { id: paymentId }, data: { status: "PAID", razorpayPaymentId } });
  return { data: payment };
}
