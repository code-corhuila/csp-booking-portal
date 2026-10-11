import { adminReservationsPage, sampleAdminReservations, statusCounts } from './sample-admin-reservations';
import { SYNTHETIC_SHOWTIMES } from './synthetic-showtimes';

const NOW = Date.UTC(2026, 9, 8, 12, 0, 0);

describe('sample admin reservations', () => {
  it('holds the reservations of several users, with unique ids', () => {
    const all = sampleAdminReservations(NOW);

    expect(all.length).toBe(12);
    expect(new Set(all.map((r) => r.id)).size).toBe(12);
    expect(new Set(all.map((r) => r.userId)).size).toBeGreaterThan(1);
  });

  it('sits on the synthetic showtimes and on seats that exist in the room', () => {
    const showtimes = new Map(SYNTHETIC_SHOWTIMES.map((s) => [s.id, s]));

    for (const r of sampleAdminReservations(NOW)) {
      const showtime = showtimes.get(r.showtimeId);
      expect(showtime).withContext(r.id).toBeDefined();
      expect(r.movieTitleSnapshot).toBe(showtime!.movieTitle);
      expect(r.seatLabels.every((label) => showtime!.seatLabels.includes(label))).withContext(r.id).toBeTrue();
    }
  });

  it('keeps the status coherent with the dates, so that a hold counts down and an expired one is past', () => {
    for (const r of sampleAdminReservations(NOW)) {
      if (r.status === 'HELD') expect(Date.parse(r.expiresAt!)).toBeGreaterThan(NOW);
      if (r.status === 'EXPIRED') expect(Date.parse(r.expiresAt!)).toBeLessThan(NOW);
      if (r.status === 'CONFIRMED') expect(r.confirmedAt).not.toBeNull();
    }
  });

  it('counts the reservations by status', () => {
    expect(statusCounts(sampleAdminReservations(NOW))).toEqual({ HELD: 3, CONFIRMED: 6, EXPIRED: 3 });
  });

  it('is sorted newest first', () => {
    const created = sampleAdminReservations(NOW).map((r) => Date.parse(r.createdAt));

    expect(created).toEqual([...created].sort((a, b) => b - a));
  });
});

describe('adminReservationsPage', () => {
  it('answers with the shared page shape and a bounded size', () => {
    const page = adminReservationsPage(1, 10, undefined, NOW);

    expect(page.data.length).toBe(10);
    expect(page.meta).toEqual({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(adminReservationsPage(2, 10, undefined, NOW).data.length).toBe(2);
  });

  it('filters by status before it pages', () => {
    const page = adminReservationsPage(1, 10, 'CONFIRMED', NOW);

    expect(page.data.length).toBe(6);
    expect(page.data.every((r) => r.status === 'CONFIRMED')).toBeTrue();
    expect(page.meta.totalPages).toBe(1);
  });

  it('gives an empty page past the end', () => {
    expect(adminReservationsPage(3, 10, undefined, NOW).data).toEqual([]);
  });
});
