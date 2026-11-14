/** The seat map of csp-booking-api (`GET /showtimes/{showtimeId}/seats`, booking-service.yaml 3.3.0, ADR-046). */
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'CONFIRMED';

export type SeatType = 'STANDARD' | 'VIP' | 'ACCESSIBLE';

export interface MapSeat {
  label: string;
  /** Absent when Catalog has no row for the seat. */
  row?: string;
  /** Absent when Catalog has no number for the seat. */
  number?: number;
  type: SeatType;
  status: SeatStatus;
}

export interface SeatMap {
  showtimeId: string;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  /** Cents per seat. */
  price: number;
  seats: MapSeat[];
}

/** One line of the drawn map; `name` is null for the seats the room gives no row. */
export interface SeatRow {
  name: string | null;
  seats: MapSeat[];
}

/**
 * Groups the seats by row in the order the room stores them. The rows keep the order of their first seat and every seat without a
 * row goes into a single unnamed row, so a room with no row data still draws as one line instead of being made up.
 */
export function groupByRow(seats: readonly MapSeat[]): SeatRow[] {
  const rows = new Map<string | null, SeatRow>();
  for (const seat of seats) {
    const name = seat.row ?? null;
    let row = rows.get(name);
    if (!row) {
      row = { name, seats: [] };
      rows.set(name, row);
    }
    row.seats.push(seat);
  }
  return Array.from(rows.values());
}
