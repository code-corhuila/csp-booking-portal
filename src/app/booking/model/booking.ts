/** The contract of csp-booking-api. Field names match the API exactly (camelCase). */
export type BookingStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface Booking {
  id: string;
  showtimeId: string;
  seatIds: string[];
  status: BookingStatus;
  movieTitleSnapshot: string;
  roomNameSnapshot: string;
  createdAt: string;
  confirmedAt: string | null;
}

export interface HoldRequest {
  showtimeId: string;
  seatIds: string[];
}

export interface HoldResponse {
  id: string;
  expiresAt: string;
}

export interface ConfirmHoldRequest {
  // Empty body - confirmation uses the hold ID from path
}

/** The shared pagination shape: every list of the system answers like this. */
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}