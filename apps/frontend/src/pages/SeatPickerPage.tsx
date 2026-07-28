import { useNavigate, useParams } from "react-router-dom";
import type { ShowtimeSeat } from "../types/types";
import { useEffect, useMemo, useState } from "react";
import { getShowtimeSeats } from "../api/showtimes";
import { holdSeats } from "../api/bookings";
import { SeatGrid } from "../components/SeatGrid";
import { SiteHeader } from "../components/SiteHeader";
export default function SeatPickerPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!showtimeId) return;
    setLoading(true);
    setError("");
    getShowtimeSeats(showtimeId)
      .then(setSeats)
      .catch((err) => setError(err.response?.data?.message ?? "Could not load this seat map."))
      .finally(() => setLoading(false));
  }, [showtimeId]);
  const selectedSeats = useMemo(
    () => seats.filter((s) => selected.includes(s.seatId)),
    [seats, selected],
  );
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const priceBySeatType = useMemo(() => {
    const prices = new Map<string, number>();
    seats.forEach((seat) => prices.set(seat.seat.seatType, seat.price));
    return [...prices.entries()];
  }, [seats]);
  const toggleSeat = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((seatId) => seatId !== id)
        : [...prev, id],
    );
  const handleHold = async () => {
    if (!showtimeId || !selected.length) return;
    setError("");
    setHolding(true);
    try {
      const booking = await holdSeats(showtimeId, selected);
      navigate(`/bookings/${booking.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          "These seats are no longer available. Please choose again.",
      );
      setHolding(false);
    }
  };
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page">
        <span className="eyebrow">Step 2 of 3 · Find your perfect view</span>
        <h1 className="title">Choose your seats</h1>
        <p className="subtitle">
          Select the seats you love. We’ll hold them for a few minutes while you
          complete payment.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="booking-layout">
          <section>
            <div className="screen">SCREEN THIS WAY</div>
            {loading ? <p className="muted">Loading available seats…</p> : <SeatGrid seats={seats} selectedSeatIds={selected} onToggle={toggleSeat} />}
            {!loading && !seats.length && !error && <p className="muted">No seats have been configured for this showtime yet.</p>}
            <div className="legend">
              <span>
                <i />
                Available
              </span>
              <span>
                <i className="selected" />
                Selected
              </span>
              <span>
                <i className="taken" />
                Unavailable
              </span>
            </div>
            {!!priceBySeatType.length && (
              <div className="seat-prices" aria-label="Seat prices">
                {priceBySeatType.map(([type, price]) => <span key={type}>{type.replace("_", " ")}: <b>₹{price.toLocaleString("en-IN")}</b></span>)}
              </div>
            )}
          </section>
          <aside className="summary-card">
            <h3>Your selection</h3>
            <p>Seats are held after you continue.</p>
            <div className="summary-line">
              <span>Seats</span>
              <b>
                {selectedSeats.length
                  ? selectedSeats
                      .map((s) => `${s.seat.row}${s.seat.number}`)
                      .join(", ")
                  : "Choose seats"}
              </b>
            </div>
            <div className="summary-line">
              <span>Tickets</span>
              <b>{selected.length} × ticket</b>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <b>₹{total.toLocaleString("en-IN")}</b>
            </div>
            <button
              className="btn"
              onClick={handleHold}
              disabled={!selected.length || holding}
            >
              {holding ? "Holding seats…" : "Continue to payment →"}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
