import { SYNTHETIC_SHOWTIMES } from './synthetic-showtimes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('SYNTHETIC_SHOWTIMES', () => {
  it('has valid, unique UUIDs as showtime ids, which is what the Booking API requires', () => {
    const ids = SYNTHETIC_SHOWTIMES.map((s) => s.id);

    expect(ids.every((id) => UUID.test(id))).toBeTrue();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('offers the 48 seats A1 to F8 of Room 1 in every showtime, without repeated labels', () => {
    for (const showtime of SYNTHETIC_SHOWTIMES) {
      expect(showtime.roomName).toBe('Room 1');
      expect(showtime.seatLabels.length).toBe(48);
      expect(new Set(showtime.seatLabels).size).toBe(48);
      expect(showtime.seatLabels[0]).toBe('A1');
      expect(showtime.seatLabels[47]).toBe('F8');
    }
  });

  it('gives every showtime a movie title and a start time', () => {
    for (const showtime of SYNTHETIC_SHOWTIMES) {
      expect(showtime.movieTitle.trim()).not.toBe('');
      expect(Number.isNaN(Date.parse(showtime.startsAt))).toBeFalse();
    }
  });
});
