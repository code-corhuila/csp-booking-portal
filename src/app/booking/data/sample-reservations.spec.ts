import { sampleReservations, samplePage } from './sample-reservations';
import { SYNTHETIC_SHOWTIMES } from './synthetic-showtimes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOW = Date.parse('2026-10-07T15:00:00Z');

describe('sample reservations', () => {
  it('has a held, a confirmed and an expired reservation, newest first, with valid unique ids', () => {
    const all = sampleReservations(NOW);

    expect(all.map((r) => r.status)).toEqual(['HELD', 'CONFIRMED', 'EXPIRED']);
    expect(all.every((r) => UUID.test(r.id))).toBeTrue();
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    const created = all.map((r) => Date.parse(r.createdAt));
    expect(created).toEqual([...created].sort((a, b) => b - a));
  });

  it('uses the showtimes, titles, room and seats of the synthetic Catalog selection', () => {
    for (const r of sampleReservations(NOW)) {
      const showtime = SYNTHETIC_SHOWTIMES.find((s) => s.id === r.showtimeId);
      expect(showtime).withContext(r.showtimeId).toBeDefined();
      expect(r.movieTitleSnapshot).toBe(showtime!.movieTitle);
      expect(r.roomNameSnapshot).toBe(showtime!.roomName);
      expect(r.seatLabels.every((l) => showtime!.seatLabels.includes(l))).toBeTrue();
    }
  });

  it('keeps each state coherent: the hold expires in the future, the confirmed one has its date, the expired one is past', () => {
    const [held, confirmed, expired] = sampleReservations(NOW);

    expect(Date.parse(held.expiresAt!)).toBeGreaterThan(NOW);
    expect(held.confirmedAt).toBeNull();
    expect(confirmed.confirmedAt).not.toBeNull();
    expect(Date.parse(expired.expiresAt!)).toBeLessThan(NOW);
    expect(expired.confirmedAt).toBeNull();
  });

  it('filters by status and answers the shared page shape', () => {
    const page = samplePage(1, 20, 'CONFIRMED', undefined, NOW);

    expect(page.data.map((r) => r.status)).toEqual(['CONFIRMED']);
    expect(page.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('respects the limit and the page', () => {
    const second = samplePage(2, 2, undefined, undefined, NOW);

    expect(second.data.length).toBe(1);
    expect(second.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(samplePage(3, 2, undefined, undefined, NOW).data).toEqual([]);
  });

  it('keeps only the reservations created before the given instant', () => {
    const all = sampleReservations(NOW);

    const page = samplePage(1, 20, undefined, all[1].createdAt, NOW);

    expect(page.data.map((r) => r.id)).toEqual([all[2].id]);
  });
});
