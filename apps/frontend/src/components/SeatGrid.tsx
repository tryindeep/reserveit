import type { ShowtimeSeat } from "../types/types";
type Props = { seats: ShowtimeSeat[]; selectedSeatIds: string[]; onToggle: (seatId: string) => void; };
export function SeatGrid({ seats, selectedSeatIds, onToggle }: Props) {
  const rows = [...new Set(seats.map(s => s.seat.row))].sort();
  return <div className="seat-map">{rows.map(row => <div className="seat-row" key={row}><span className="row-label">{row}</span><div className="seat-row-buttons">{seats.filter(s => s.seat.row === row).sort((a,b) => a.seat.number - b.seat.number).map(seat => { const selected = selectedSeatIds.includes(seat.seatId); const taken = seat.status !== "AVAILABLE"; return <button key={seat.id} disabled={taken} onClick={() => onToggle(seat.seatId)} className={`seat ${selected ? "selected" : ""} ${taken ? "taken" : ""}`} title={`${row}${seat.seat.number} — ₹${seat.price}`}>{seat.seat.number}</button>; })}</div></div>)}</div>;
}
