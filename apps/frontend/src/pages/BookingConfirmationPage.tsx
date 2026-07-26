import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import type { Booking } from "../types/types";
import { getBookingById } from "../api/bookings";


export default function BookingConfirmationPage(){
    const {bookingId} = useParams<{bookingId : string}>();
    const [booking , setBooking] = useState<Booking |null>(null);

    useEffect(() => {
        if(!bookingId) return;
        getBookingById(bookingId).then(setBooking);
    },[bookingId]);

    if(!booking) return <p>Loading....</p>
    
    return (
        <div>
            <h1>Booking{booking.status}</h1>
            <p>Total : {booking.totalAmount}</p>
            <p>Expires at: {new Date(booking.expiresAt).toLocaleString()}</p>
        </div>
    );
} 