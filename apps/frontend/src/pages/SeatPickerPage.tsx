import { useNavigate, useParams } from "react-router-dom"
import type { ShowtimeSeat } from "../types/types"
import { useEffect, useState } from "react";
import { getShowtimeSeats } from "../api/showtimes";
import { holdSeats } from "../api/bookings";
import { SeatGrid } from "../components/SeatGrid";

export default function SeatPickerPage(){
  const {showtimeId} = useParams<{showtimeId : string}>();
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if(!showtimeId) return;
    getShowtimeSeats(showtimeId).then(setSeats);
  },[showtimeId]);

  const toggleSeat = (seatId :string) => {
    setSelected((prev : any) => (prev.includes(seatId) ? prev.filter((id : any) => id !== seatId) : [...prev,seatId]));
  }

  const handleHold = async () => {
    if(!showtimeId || selected.length === 0) return;
    setError("");
    try {
      // holdSeats correctly takes the full selected array (matches your backend's seatIds: string[]
      const booking = await holdSeats(showtimeId, selected);
      navigate(`/bookings/${booking.id}`)
    } catch (error : any) {
      setError(error.response?.data?.message ?? "Failed to hold seats");
    }
  }

  return (
    <div>
      <h1>Select your seats</h1>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <SeatGrid seats={seats} selectedSeatIds={selected} onToggle={toggleSeat}/>
        <p>{selected.length} seat(s) selected</p>
        <button onClick={handleHold} disabled={selected.length === 0}>
          Hold seats
        </button>
    </div>
  );
}