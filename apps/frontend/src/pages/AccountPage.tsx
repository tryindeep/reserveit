import { Link, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { getMyBookings } from "../api/bookings";
import { useAuthStore } from "../store/authStore";

type BookingSummary = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  showtime: { startTime: string; movie: { name: string }; screen: { name: string; theater: { name: string; city: string } } };
  bookingSeats: { seat: { row: string; number: number } }[];
};

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.role !== "CUSTOMER") return;
    setLoading(true);
    getMyBookings().then(setBookings).catch((err) => setError(err.response?.data?.message ?? "Could not load bookings.")).finally(() => setLoading(false));
  }, [user?.role]);
  const [upcoming, previous] = useMemo(() => bookings.reduce<[BookingSummary[], BookingSummary[]]>((groups, booking) => {
    const isUpcoming = new Date(booking.showtime.startTime) >= new Date() && ["PENDING", "CONFIRMED"].includes(booking.status);
    groups[isUpcoming ? 0 : 1].push(booking);
    return groups;
  }, [[], []]), [bookings]);
  if (!user) return <Navigate to="/login" replace />;
  const managementPath = user.role === "SYSTEM_ADMIN" ? "/admin" : user.role === "CLIENT" ? "/partner" : null;
  const renderBookings = (items: BookingSummary[], empty: string) => items.length ? <div className="booking-history">{items.map((booking) => <article key={booking.id} className="booking-history-item"><div><b>{booking.showtime.movie.name}</b><span>{booking.showtime.screen.theater.name}, {booking.showtime.screen.theater.city} · {booking.showtime.screen.name}</span><span>{new Date(booking.showtime.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div><div className="booking-history-meta"><b>₹{booking.totalAmount.toLocaleString("en-IN")}</b><span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status}</span><span>{booking.bookingSeats.map((item) => `${item.seat.row}${item.seat.number}`).join(", ")}</span></div></article>)}</div> : <p className="muted">{empty}</p>;
  return <div className="app-shell"><SiteHeader /><main className="page account-page"><span className="eyebrow">Your account</span><h1 className="title">Hello, {user.name.split(" ")[0]}.</h1><section className="account-card"><div><span className="eyebrow">Profile details</span><h2>{user.name}</h2><p>{user.email}</p>{user.phone && <p>{user.phone}</p>}</div>{managementPath && <Link className="btn" to={managementPath}>Open management dashboard</Link>}</section>{user.role === "CUSTOMER" && <>{error && <p className="error">{error}</p>}<section className="account-section"><span className="eyebrow">Your tickets</span><h2>Upcoming bookings</h2>{loading ? <p className="muted">Loading bookings…</p> : renderBookings(upcoming, "No upcoming bookings yet.")}</section><section className="account-section"><span className="eyebrow">Booking history</span><h2>Previous bookings</h2>{loading ? null : renderBookings(previous, "No previous bookings yet.")}</section></>}</main></div>;
}
