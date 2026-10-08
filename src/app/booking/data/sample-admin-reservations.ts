import { Booking, BookingStatus, Page } from '../model/booking';
import { SYNTHETIC_SHOWTIMES } from './synthetic-showtimes';

const MINUTE = 60_000;

const USERS = [
  'dddddddd-0000-4000-8000-000000000001',
  'dddddddd-0000-4000-8000-000000000002',
  'dddddddd-0000-4000-8000-000000000003',
  'dddddddd-0000-4000-8000-000000000004',
];

/** showtime index, user index, seats, status, minutes ago it was created. */
const ROWS: [number, number, string[], BookingStatus, number][] = [
  [0, 3, ['B4', 'B5'], 'HELD', 2],
  [1, 0, ['C3'], 'HELD', 4],
  [2, 1, ['A1', 'A2', 'A3'], 'HELD', 7],
  [0, 2, ['D1', 'D2'], 'CONFIRMED', 35],
  [3, 0, ['E5', 'E6'], 'CONFIRMED', 90],
  [1, 3, ['F1'], 'CONFIRMED', 150],
  [4, 1, ['B1', 'B2', 'B3', 'B4'], 'CONFIRMED', 240],
  [2, 2, ['C7', 'C8'], 'CONFIRMED', 360],
  [5, 0, ['A5'], 'CONFIRMED', 600],
  [3, 1, ['F7'], 'EXPIRED', 720],
  [0, 2, ['E1', 'E2'], 'EXPIRED', 900],
  [1, 3, ['D6'], 'EXPIRED', 1200],
];

/**
 * Cut 2 sample of the administration screen. The Booking contract has no read of every user's
 * reservations yet, so the portal shows these, built from `now` so that a hold is always counting down
 * and an expired one is always past. Replace it with the API response once the endpoint exists.
 */
export function sampleAdminReservations(now: number = Date.now()): Booking[] {
  return ROWS.map(([showtimeIndex, userIndex, seatLabels, status, minutesAgo], index) => {
    const showtime = SYNTHETIC_SHOWTIMES[showtimeIndex];
    const createdAt = now - minutesAgo * MINUTE;
    const expiresAt = status === 'CONFIRMED' ? null : createdAt + 10 * MINUTE;
    const confirmedAt = status === 'CONFIRMED' ? createdAt + MINUTE : null;
    return {
      id: `0c0ffee0-0000-4000-8000-${(0xb1 + index).toString(16).padStart(12, '0')}`,
      showtimeId: showtime.id,
      seatLabels,
      status,
      userId: USERS[userIndex],
      expiresAt: expiresAt === null ? null : new Date(expiresAt).toISOString(),
      movieTitleSnapshot: showtime.movieTitle,
      roomNameSnapshot: showtime.roomName,
      totalAmount: 0,
      createdAt: new Date(createdAt).toISOString(),
      confirmedAt: confirmedAt === null ? null : new Date(confirmedAt).toISOString(),
    };
  });
}

export function statusCounts(bookings: Booking[]): Record<BookingStatus, number> {
  const counts: Record<BookingStatus, number> = { HELD: 0, CONFIRMED: 0, EXPIRED: 0 };
  for (const booking of bookings) counts[booking.status]++;
  return counts;
}

/** The same page shape as `GET /reservations`; the filter is applied before the page is cut. */
export function adminReservationsPage(
  page: number,
  limit: number,
  status?: BookingStatus,
  now: number = Date.now(),
): Page<Booking> {
  const matching = sampleAdminReservations(now).filter((r) => !status || r.status === status);
  return {
    data: matching.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) },
  };
}
