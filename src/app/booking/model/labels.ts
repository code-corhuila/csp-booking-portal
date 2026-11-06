import { BookingStatus } from './booking';

/** What a person reads for each status of the contract; the API values (HELD, CONFIRMED, EXPIRED) never reach the screen. */
export const STATUS_LABEL: Record<BookingStatus, string> = {
  HELD: 'Retención activa',
  CONFIRMED: 'Confirmada',
  EXPIRED: 'Vencida',
};

/** The sentence of a seat conflict (422 BUSINESS_RULE_VIOLATION): the API answers it in English, so the portal says it in Spanish. */
export const SEAT_CONFLICT_MESSAGE =
  'Uno o más asientos ya no están disponibles. No se retuvo ningún asiento; elige otros e inténtalo de nuevo.';

const LOCALE = 'es-CO';

/** An instant of the API (RFC 3339, UTC) as the person reads it in Colombia, for example "8/10/2026, 7:00 p. m.". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** The same instant with the long date, for the screens that list many of them. */
export function formatDateTimeLong(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Only the time of day, for what expires today. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { timeStyle: 'short' });
}
