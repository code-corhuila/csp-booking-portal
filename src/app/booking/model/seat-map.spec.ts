import { MapSeat, groupByRow } from './seat-map';

const seat = (label: string, row?: string, number?: number): MapSeat => ({
  label,
  ...(row === undefined ? {} : { row }),
  ...(number === undefined ? {} : { number }),
  type: 'STANDARD',
  status: 'AVAILABLE',
});

describe('groupByRow', () => {
  it('groups the seats by row keeping the order of the room', () => {
    const rows = groupByRow([seat('A1', 'A', 1), seat('A2', 'A', 2), seat('B1', 'B', 1)]);

    expect(rows.map((r) => r.name)).toEqual(['A', 'B']);
    expect(rows[0].seats.map((s) => s.label)).toEqual(['A1', 'A2']);
    expect(rows[1].seats.map((s) => s.label)).toEqual(['B1']);
  });

  it('puts every seat without a row into one unnamed row, in order', () => {
    const rows = groupByRow([seat('Z1'), seat('A1', 'A', 1), seat('Z2')]);

    expect(rows.map((r) => r.name)).toEqual([null, 'A']);
    expect(rows[0].seats.map((s) => s.label)).toEqual(['Z1', 'Z2']);
  });

  it('answers no rows for a room without seats', () => {
    expect(groupByRow([])).toEqual([]);
  });
});
