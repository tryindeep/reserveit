import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Booking } from "../types/types";
import { getBookingById } from "../api/bookings";
import { createOrder, verifyPayment } from "../api/payments";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const refreshBooking = () => {
    if (!bookingId) return;
    getBookingById(bookingId).then(setBooking);
  };

  useEffect(() => {
    refreshBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handlePay = async () => {
    if (!bookingId) return;
    setError("");
    setPaying(true);
    try {
      const order = await createOrder(bookingId);
      if (!order) throw new Error("Could not create order");

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Reservit",
        description: "Movie ticket booking",
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment(response);
            let attempts = 0;
            const poll = setInterval(async () => {
              attempts += 1;
              const updated = await getBookingById(bookingId);
              if (updated) setBooking(updated);
              if (updated?.status !== "PENDING" || attempts >= 5) clearInterval(poll);
            }, 1500);
          } catch (err: any) {
            setError(err.response?.data?.message ?? "Payment verification failed");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to start payment");
      setPaying(false);
    }
  };

  if (!booking) return <p>Loading....</p>;

  return (
    <div>
      <h1>Booking {booking.status}</h1>
      <p>Total: {booking.totalAmount}</p>
      {booking.status === "PENDING" && (
        <>
          <p>Expires at: {new Date(booking.expiresAt).toLocaleString()}</p>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button onClick={handlePay} disabled={paying}>
            {paying ? "Processing..." : "Pay Now"}
          </button>
        </>
      )}
    </div>
  );
}