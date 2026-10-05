/** The contract of csp-booking-api. Field names match the API exactly (camelCase). */
export type BookingStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED';

export interface Booking {
  id: string;
  showtimeId: string;
  seatLabels: string[];
  status: BookingStatus;
  userId: string;
  expiresAt: string | null;
  movieTitleSnapshot: string;
  roomNameSnapshot: string;
  totalAmount: number;
  createdAt: string;
  confirmedAt: string | null;
}

export interface HoldRequest {
  showtimeId: string;
  seatLabels: string[];
  holdDurationSeconds?: number;
}

/** The shared pagination shape: every list of the system answers like this. */
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
