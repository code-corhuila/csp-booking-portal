import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { SYNTHETIC_SHOWTIMES } from '../data/synthetic-showtimes';
import { Booking } from '../model/booking';
import { SeatMapPageComponent } from './seat-map-page.component';

const SHOWTIME = SYNTHETIC_SHOWTIMES[0];
const HOLD_ID = '11111111-1111-1111-1111-111111111111';

function held(): Booking {
  return {
    id: HOLD_ID,
    showtimeId: SHOWTIME.id,
    seatLabels: ['A2', 'B3'],
    status: 'HELD',
    userId: 'user-1',
    expiresAt: '2026-10-06T20:10:00Z',
    movieTitleSnapshot: SHOWTIME.movieTitle,
    roomNameSnapshot: SHOWTIME.roomName,
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

  function render(id = SHOWTIME.id): HTMLElement {
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

  const seat = (root: HTMLElement, label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button.seat')).find(b => b.textContent?.trim() === label)!;
  const pick = (root: HTMLElement, ...labels: string[]) => {
    labels.forEach(l => seat(root, l).click());
    fixture.detectChanges();
  };
  const holdButton = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(.seat)')).find(b => b.textContent?.includes('Hold'))!;

  beforeEach(() => {
    api = jasmine.createSpyObj<BookingApiService>('BookingApiService', ['hold']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
  });

  it('renders the showtime with its 48 seats and nothing selected', () => {
    const root = render();

    expect(root.textContent).toContain(SHOWTIME.movieTitle);
    expect(root.textContent).toContain(SHOWTIME.roomName);
    expect(root.querySelectorAll('button.seat').length).toBe(48);
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
    expect(holdButton(root).disabled).toBeTrue();
  });

  it('marks the picked seats, lists them and enables the hold', () => {
    const root = render();

    pick(root, 'B3', 'A2');

    expect(seat(root, 'A2').classList).toContain('selected');
    expect(seat(root, 'B3').getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).toContain('A2, B3');
    expect(holdButton(root).disabled).toBeFalse();
  });

  it('unselects a seat that is picked again', () => {
    const root = render();

    pick(root, 'A2', 'A2');

    expect(seat(root, 'A2').classList).not.toContain('selected');
    expect(holdButton(root).disabled).toBeTrue();
  });

  it('creates the hold with the showtime, the seats in map order and the snapshot, then goes to the checkout', () => {
    api.hold.and.returnValue(of(held()));
    const root = render();
    pick(root, 'B3', 'A2');

    holdButton(root).click();

    expect(api.hold).toHaveBeenCalledOnceWith(
      { showtimeId: SHOWTIME.id, seatLabels: ['A2', 'B3'], movieTitle: SHOWTIME.movieTitle, roomName: SHOWTIME.roomName },
      jasmine.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(router.navigate).toHaveBeenCalledOnceWith(['../../checkout', HOLD_ID], { relativeTo: route });
  });

  it('shows the seat conflict with the backend reason, says that nothing was held and clears the selection', () => {
    api.hold.and.returnValue(throwError(() => apiError(422, 'BUSINESS_RULE_VIOLATION', 'At least one requested seat is not available.')));
    const root = render();
    pick(root, 'A2', 'B3');

    holdButton(root).click();
    fixture.detectChanges();

    const alert = root.querySelector('[role="alert"]')?.textContent;
    expect(alert).toContain('At least one requested seat is not available.');
    expect(alert).toContain('No seat was held');
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
    expect(holdButton(root).disabled).toBeTrue();
    expect(api.hold).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('lets the client pick other seats after a seat conflict, with a new Idempotency-Key', () => {
    api.hold.and.returnValues(
      throwError(() => apiError(422, 'BUSINESS_RULE_VIOLATION', 'At least one requested seat is not available.')),
      of(held()),
    );
    const root = render();
    pick(root, 'A2');
    holdButton(root).click();
    fixture.detectChanges();

    pick(root, 'C4');
    holdButton(root).click();
    fixture.detectChanges();

    const calls = api.hold.calls.allArgs();
    expect(calls[1][0].seatLabels).toEqual(['C4']);
    expect(calls[1][1]).not.toBe(calls[0][1]);
    expect(router.navigate).toHaveBeenCalledOnceWith(['../../checkout', HOLD_ID], { relativeTo: route });
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the backend answer and keeps the selection on any other failure', () => {
    api.hold.and.returnValue(throwError(() => apiError(0, 'NETWORK_ERROR', 'The server cannot be reached.')));
    const root = render();
    pick(root, 'A2');

    holdButton(root).click();
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('The server cannot be reached.');
    expect(seat(root, 'A2').classList).toContain('selected');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reuses the same Idempotency-Key when the same selection is retried and renews it when the selection changes', () => {
    api.hold.and.returnValue(throwError(() => apiError(0, 'NETWORK_ERROR', 'The server cannot be reached.')));
    const root = render();
    pick(root, 'A2');

    holdButton(root).click();
    fixture.detectChanges();
    holdButton(root).click();
    fixture.detectChanges();
    pick(root, 'A3');
    holdButton(root).click();

    const keys = api.hold.calls.allArgs().map(args => args[1]);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('shows a not-found message for a showtime that does not exist', () => {
    const root = render('00000000-0000-4000-8000-000000000000');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('does not exist');
    expect(root.querySelectorAll('button.seat').length).toBe(0);
  });

  it('loads the other showtime and clears the selection when the route is reused for another id', () => {
    const other = SYNTHETIC_SHOWTIMES[1];
    const root = render();
    pick(root, 'A2');

    params.next(convertToParamMap({ id: other.id }));
    fixture.detectChanges();

    expect(root.textContent).toContain(other.movieTitle);
    expect(root.querySelectorAll('button.seat.selected').length).toBe(0);
  });
});
