import { BookingStatus } from './booking';
import { SEAT_CONFLICT_MESSAGE, STATUS_LABEL, formatDateTime, formatDateTimeLong, formatTime } from './labels';

describe('labels', () => {
  it('names every status of the contract in Spanish and never shows the API value', () => {
    const statuses: BookingStatus[] = ['HELD', 'CONFIRMED', 'EXPIRED'];

    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...statuses].sort());
    expect(statuses.map((status) => STATUS_LABEL[status])).toEqual(['Retención activa', 'Confirmada', 'Vencida']);
  });

  it('says the seat conflict in one Spanish sentence that tells that nothing was held', () => {
    expect(SEAT_CONFLICT_MESSAGE).toContain('ya no están disponibles');
    expect(SEAT_CONFLICT_MESSAGE).toContain('No se retuvo ningún asiento');
  });

  it('writes the dates the way Colombia does: day before month, whatever the time zone of the machine', () => {
    // 2026-10-08 12:00 UTC is the 8th in every time zone from -12 to +11, so the day cannot move.
    const iso = '2026-10-08T12:00:00Z';

    expect(formatDateTime(iso)).toMatch(/^8\/10\/2026/);
    expect(formatDateTimeLong(iso)).toContain('2026');
    expect(formatTime(iso)).toMatch(/\d{1,2}:\d{2}/);
  });
});
