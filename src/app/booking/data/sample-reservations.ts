import { Booking, BookingStatus, Page } from '../model/booking';
import { SYNTHETIC_SHOWTIMES, SyntheticShowtime } from './synthetic-showtimes';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const SAMPLE_USER = 'dddddddd-0000-4000-8000-000000000004';

/**
 * Burned-in sample reservations of the product demo: what "My bookings" shows when the Booking
 * service cannot answer. They sit on the synthetic Catalog showtimes and are built from `now` so
 * that the held one is always still counting down and the expired one is always past.
 */
export function sampleReservations(now: number = Date.now()): Booking[] {
  const sample = (
    id: string,
    showtime: SyntheticShowtime,
    seatLabels: string[],
    status: BookingStatus,
    createdAt: number,
    expiresAt: number | null,
    confirmedAt: number | null,
  ): Booking => ({
    id,
    showtimeId: showtime.id,
    seatLabels,
    status,
    userId: SAMPLE_USER,
    expiresAt: expiresAt === null ? null : new Date(expiresAt).toISOString(),
    movieTitleSnapshot: showtime.movieTitle,
    roomNameSnapshot: showtime.roomName,
    totalAmount: 0,
    createdAt: new Date(createdAt).toISOString(),
    confirmedAt: confirmedAt === null ? null : new Date(confirmedAt).toISOString(),
  });

  return [
    sample('0c0ffee0-0000-4000-8000-0000000000a1', SYNTHETIC_SHOWTIMES[0], ['B4', 'B5'], 'HELD',
      now - 2 * MINUTE, now + 8 * MINUTE, null),
    sample('0c0ffee0-0000-4000-8000-0000000000a2', SYNTHETIC_SHOWTIMES[1], ['D1', 'D2', 'D3'], 'CONFIRMED',
      now - 3 * HOUR, null, now - 3 * HOUR + MINUTE),
    sample('0c0ffee0-0000-4000-8000-0000000000a3', SYNTHETIC_SHOWTIMES[3], ['F7'], 'EXPIRED',
      now - 5 * HOUR, now - 5 * HOUR + 10 * MINUTE, null),
  ];
}

/** The same filters and the same page shape as `GET /reservations`. */
export function samplePage(
  page: number,
  limit: number,
  status?: BookingStatus,
  createdBefore?: string,
  now: number = Date.now(),
): Page<Booking> {
  const matching = sampleReservations(now).filter(
    (r) => (!status || r.status === status) && (!createdBefore || Date.parse(r.createdAt) < Date.parse(createdBefore)),
  );
  return {
    data: matching.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) },
  };
}
