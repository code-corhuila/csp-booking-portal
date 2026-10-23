import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking } from '../model/booking';
import { MapSeat, SeatMap } from '../model/seat-map';
import { SeatMapPageComponent } from './seat-map-page.component';

const SHOWTIME_ID = '44444444-4444-4444-4444-444444444444';
const HOLD_ID = '11111111-1111-1111-1111-111111111111';

const seat = (label: string, row: string | undefined, number: number | undefined, status: MapSeat['status'] = 'AVAILABLE'): MapSeat => ({
  label,
  ...(row === undefined ? {} : { row }),
  ...(number === undefined ? {} : { number }),
  type: 'STANDARD',
  status,
});

function seatMap(seats: MapSeat[] = [
  seat('A1', 'A', 1), seat('A2', 'A', 2, 'HELD'), seat('A3', 'A', 3, 'CONFIRMED'),
  seat('B1', 'B', 1), seat('B2', 'B', 2),
]): SeatMap {
  return {
    showtimeId: SHOWTIME_ID,
    movieTitle: 'The Silent Reel',
    roomName: 'Room 1',
    startsAt: '2026-10-06T20:00:00Z',
    endsAt: '2026-10-06T22:00:00Z',
    price: 12000,
    seats,
  };
}

function held(): Booking {
  return {
    id: HOLD_ID,
    showtimeId: SHOWTIME_ID,
    seatLabels: ['A1', 'B2'],
    status: 'HELD',
    userId: 'user-1',
    expiresAt: '2026-10-06T20:10:00Z',
    movieTitleSnapshot: 'The Silent Reel',
    roomNameSnapshot: 'Room 1',
    totalAmount: 0,
    createdAt: '2026-10-06T20:00:00Z',
    confirmedAt: null,
  };
}

function apiError(status: number, code: string, message: string): ApiError {
  return { status, code, message, details: [], traceId: 't-1', userMessage: message };
}

describe('SeatMapPageComponent', () => {
  let api: jasmine.SpyObj<BookingApiService>;
  let router: jasmine.SpyObj<Router>;
  let params: BehaviorSubject<ParamMap>;
  let fixture: ComponentFixture<SeatMapPageComponent>;
  let route: ActivatedRoute;

  function render(id = SHOWTIME_ID): HTMLElement {
    params = new BehaviorSubject(convertToParamMap({ id }));
    route = { paramMap: params } as unknown as ActivatedRoute;
    TestBed.configureTestingModule({
      imports: [SeatMapPageComponent],
      providers: [
        { provide: BookingApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    fixture = TestBed.createComponent(SeatMapPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const seatButton = (root: HTMLElement, label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.seat')).find(b => b.textContent?.trim() === label)!;
  const pick = (root: HTMLElement, ...labels: string[]) => {
    labels.forEach(l => seatButton(root, l).click());
    fixture.detectChanges();
  };
  const holdButton = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(.seat)')).find(b => b.textContent?.includes('Retener'))!;
  const retryButton = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(.seat)')).find(b => b.textContent?.includes('Reintentar'));

  beforeEach(() => {
    api = jasmine.createSpyObj<BookingApiService>('BookingApiService', ['hold', 'getSeatMap']);
    api.getSeatMap.and.returnValue(of(seatMap()));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
  });

  it('requests the seat map of the showtime of the route and draws its seats by row', () => {
    const root = render();

    expect(api.getSeatMap).toHaveBeenCalledOnceWith(SHOWTIME_ID);
    expect(root.textContent).toContain('The Silent Reel');
    expect(root.textContent).toContain('Room 1');
    const rows = Array.from(root.querySelectorAll('.seats-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.row-name')?.textContent?.trim()).toBe('A');
    expect(Array.from(rows[0].querySelectorAll('button.seat')).map(b => b.textContent?.trim())).toEqual(['A1', 'A2', 'A3']);
    expect(Array.from(rows[1].querySelectorAll('button.seat')).map(b => b.textContent?.trim())).toEqual(['B1', 'B2']);
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
    expect(holdButton(root).disabled).toBeTrue();
  });

  it('shows a loading message while the map is on its way', () => {
    api.getSeatMap.and.returnValue(NEVER);

    const root = render();

    expect(root.querySelector('[role="status"]')?.textContent).toContain('Cargando');
    expect(root.querySelectorAll('button.seat').length).toBe(0);
  });

  it('shows the held and the confirmed seats as taken: they cannot be picked', () => {
    const root = render();

    expect(seatButton(root, 'A2').disabled).toBeTrue();
    expect(seatButton(root, 'A2').classList).toContain('held');
    expect(seatButton(root, 'A3').disabled).toBeTrue();
    expect(seatButton(root, 'A3').classList).toContain('occupied');
    expect(seatButton(root, 'A1').disabled).toBeFalse();

    seatButton(root, 'A2').click();
    seatButton(root, 'A3').click();
    fixture.detectChanges();

    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
    expect(holdButton(root).disabled).toBeTrue();
  });

  it('draws the seats without a row in one unnamed row, in order, and never invents a row', () => {
    api.getSeatMap.and.returnValue(of(seatMap([seat('Z1', undefined, undefined), seat('Z2', undefined, undefined)])));

    const root = render();

    const rows = Array.from(root.querySelectorAll('.seats-row'));
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.row-name')?.textContent?.trim()).toBe('');
    expect(Array.from(rows[0].querySelectorAll('button.seat')).map(b => b.textContent?.trim())).toEqual(['Z1', 'Z2']);
  });

  it('marks the picked seats, lists them and enables the hold', () => {
    const root = render();

    pick(root, 'B2', 'A1');

    expect(seatButton(root, 'A1').classList).toContain('selected');
    expect(seatButton(root, 'B2').getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).toContain('A1, B2');
    expect(holdButton(root).disabled).toBeFalse();
  });

  it('unselects a seat that is picked again', () => {
    const root = render();

    pick(root, 'A1', 'A1');

    expect(seatButton(root, 'A1').classList).not.toContain('selected');
    expect(holdButton(root).disabled).toBeTrue();
  });

  it('creates the hold with the showtime, the seats in map order and the title and room of the map, then goes to the checkout', () => {
    api.hold.and.returnValue(of(held()));
    const root = render();
    pick(root, 'B2', 'A1');

    holdButton(root).click();

    expect(api.hold).toHaveBeenCalledOnceWith(
      { showtimeId: SHOWTIME_ID, seatLabels: ['A1', 'B2'], movieTitle: 'The Silent Reel', roomName: 'Room 1' },
      jasmine.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(router.navigate).toHaveBeenCalledOnceWith(['../../checkout', HOLD_ID], { relativeTo: route });
  });

  it('says a showtime that does not exist is not there, without seats and without a retry', () => {
    api.getSeatMap.and.returnValue(throwError(() => apiError(404, 'NOT_FOUND', 'showtime is not available')));

    const root = render('00000000-0000-4000-8000-000000000000');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no existe');
    expect(root.querySelectorAll('button.seat').length).toBe(0);
    expect(retryButton(root)).toBeUndefined();
  });

  it('shows the failure with a retry that requests the map again, and never a synthetic room', () => {
    api.getSeatMap.and.returnValues(
      throwError(() => apiError(503, 'SERVICE_UNAVAILABLE', 'A required service or dependency is unavailable')),
      of(seatMap()),
    );

    const root = render();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('A required service or dependency is unavailable');
    expect(root.querySelectorAll('button.seat').length).toBe(0);

    retryButton(root)!.click();
    fixture.detectChanges();

    expect(api.getSeatMap).toHaveBeenCalledTimes(2);
    expect(api.getSeatMap.calls.argsFor(1)).toEqual([SHOWTIME_ID]);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelectorAll('button.seat').length).toBe(5);
  });

  it('shows the seat conflict in Spanish, clears the selection and reads the map again to show what was taken', () => {
    api.hold.and.returnValue(throwError(() => apiError(422, 'BUSINESS_RULE_VIOLATION', 'one or more seats are not available')));
    api.getSeatMap.and.returnValues(
      of(seatMap()),
      of(seatMap([seat('A1', 'A', 1, 'HELD'), seat('B1', 'B', 1), seat('B2', 'B', 2)])),
    );
    const root = render();
    pick(root, 'A1', 'B2');

    holdButton(root).click();
    fixture.detectChanges();

    const alert = root.querySelector('[role="alert"]')?.textContent;
    expect(alert?.trim()).toBe('Uno o más asientos ya no están disponibles. No se retuvo ningún asiento; elige otros e inténtalo de nuevo.');
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
    expect(holdButton(root).disabled).toBeTrue();
    expect(api.getSeatMap).toHaveBeenCalledTimes(2);
    expect(seatButton(root, 'A1').disabled).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets the client pick other seats after a seat conflict, with a new Idempotency-Key', () => {
    api.hold.and.returnValues(
      throwError(() => apiError(422, 'BUSINESS_RULE_VIOLATION', 'one or more seats are not available')),
      of(held()),
    );
    const root = render();
    pick(root, 'A1');
    holdButton(root).click();
    fixture.detectChanges();

    pick(root, 'B1');
    holdButton(root).click();
    fixture.detectChanges();

    const calls = api.hold.calls.allArgs();
    expect(calls[1][0].seatLabels).toEqual(['B1']);
    expect(calls[1][1]).not.toBe(calls[0][1]);
    expect(router.navigate).toHaveBeenCalledOnceWith(['../../checkout', HOLD_ID], { relativeTo: route });
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('treats the conflict code with another HTTP status as an ordinary failure: nothing is cleared and nothing is claimed', () => {
    api.hold.and.returnValue(throwError(() => apiError(400, 'BUSINESS_RULE_VIOLATION', 'The request is not valid.')));
    const root = render();
    pick(root, 'A1');

    holdButton(root).click();
    fixture.detectChanges();

    const alert = root.querySelector('[role="alert"]')?.textContent;
    expect(alert).toContain('The request is not valid.');
    expect(alert).not.toContain('No se retuvo ningún asiento');
    expect(seatButton(root, 'A1').classList).toContain('selected');
    expect(api.getSeatMap).toHaveBeenCalledTimes(1);
  });

  it('shows the backend answer and keeps the selection on any other failure of the hold', () => {
    api.hold.and.returnValue(throwError(() => apiError(0, 'NETWORK_ERROR', 'The server cannot be reached.')));
    const root = render();
    pick(root, 'A1');

    holdButton(root).click();
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('The server cannot be reached.');
    expect(seatButton(root, 'A1').classList).toContain('selected');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reuses the same Idempotency-Key when the same selection is retried and renews it when the selection changes', () => {
    api.hold.and.returnValue(throwError(() => apiError(0, 'NETWORK_ERROR', 'The server cannot be reached.')));
    const root = render();
    pick(root, 'A1');

    holdButton(root).click();
    fixture.detectChanges();
    holdButton(root).click();
    fixture.detectChanges();
    pick(root, 'B1');
    holdButton(root).click();

    const keys = api.hold.calls.allArgs().map(args => args[1]);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('loads the map of the other showtime and clears the selection when the route is reused for another id', () => {
    const other = { ...seatMap(), showtimeId: '55555555-5555-4555-8555-555555555555', movieTitle: 'Interstellar' };
    api.getSeatMap.and.returnValues(of(seatMap()), of(other));
    const root = render();
    pick(root, 'A1');

    params.next(convertToParamMap({ id: other.showtimeId }));
    fixture.detectChanges();

    expect(api.getSeatMap).toHaveBeenCalledWith(other.showtimeId);
    expect(root.textContent).toContain('Interstellar');
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
  });
});
