/**
 * Cut 2 synthetic selection. Catalog has no backend yet, so the showtimes the portal can
 * book are shipped as a constant that mirrors the dataset of csp-catalog-portal (same showtime
 * ids, titles, room and seat labels). Replace it with the Catalog response once it exists.
 */
export interface SyntheticShowtime {
  id: string;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  seatLabels: string[];
}

const ROOM_1_SEATS = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((row) =>
  Array.from({ length: 8 }, (_, index) => `${row}${index + 1}`),
);

const showtime = (id: string, movieTitle: string, startsAt: string): SyntheticShowtime => ({
  id,
  movieTitle,
  roomName: 'Room 1',
  startsAt,
  seatLabels: ROOM_1_SEATS,
});

export const SYNTHETIC_SHOWTIMES: SyntheticShowtime[] = [
  showtime('44444444-4444-4444-4444-444444444444', 'The Silent Reel', '2026-10-06T20:00:00'),
  showtime('55555555-5555-4555-8555-555555555555', 'Interstellar', '2026-10-06T10:00:00'),
  showtime('66666666-6666-4666-8666-666666666666', 'Interstellar', '2026-10-06T13:30:00'),
  showtime('77777777-7777-4777-8777-777777777777', 'Oppenheimer', '2026-10-06T11:00:00'),
  showtime('88888888-8888-4888-8888-888888888888', 'Oppenheimer', '2026-10-06T15:00:00'),
  showtime('99999999-9999-4999-8999-999999999999', 'The Dark Knight', '2026-10-06T14:15:00'),
  showtime('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Avatar: The Way of Water', '2026-10-06T16:30:00'),
];
