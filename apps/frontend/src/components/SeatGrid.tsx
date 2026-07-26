import type { ShowtimeSeat } from "../types/types";

type Props = {
  seats: ShowtimeSeat[];
  selectedSeatIds: string[];
  onToggle: (seatId: string) => void;
};

export function SeatGrid({ seats, selectedSeatIds, onToggle }: Props) {
  const rows = [...new Set(seats.map((s) => s.seat.row))].sort();

  return (
    <div>
      {rows.map((row) => (
        <div key={row} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          {seats
            .filter((s) => s.seat.row === row)
            .sort((a, b) => a.seat.number - b.seat.number)
            .map((seat) => {
              const isSelected = selectedSeatIds.includes(seat.seatId);
              const isTaken = seat.status !== "AVAILABLE";
              return (
                <button
                  key={seat.id}
                  disabled={isTaken}
                  onClick={() => onToggle(seat.seatId)}
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: isTaken ? "#ccc" : isSelected ? "#4caf50" : "#fff",
                    border: "1px solid #999",
                    cursor: isTaken ? "not-allowed" : "pointer",
                  }}
                  title={`${row}${seat.seat.number} — ₹${seat.price}`}
                >
                  {seat.seat.number}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}