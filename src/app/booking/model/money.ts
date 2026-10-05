/**
 * Money crosses the boundary in minor units. "12.3" becomes 1230 by reading the
 * text, never by multiplying a float: 0.07 * 100 is 7.000000000000001.
 * Returns null when the text is not a positive amount with at most two decimals.
 */
export function toCents(text: string): number | null {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return cents > 0 ? cents : null;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
