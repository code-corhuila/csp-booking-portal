import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking } from '../model/booking';
import { CheckoutPageComponent } from './checkout-page.component';

const ID = '11111111-1111-1111-1111-111111111111';

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: ID,
    showtimeId: '22222222-2222-2222-2222-222222222222',
    seatLabels: ['A1', 'A2'],
    status: 'HELD',
    userId: 'user-1',
    expiresAt: '2026-10-06T20:10:00Z',
    movieTitleSnapshot: 'Dune',
    roomNameSnapshot: 'Room 1',
    totalAmount: 0,
    createdAt: '2026-10-06T20:00:00Z',
    confirmedAt: null,
    ...overrides,
  };
}

function apiError(status: number, code: string, message: string): ApiError {
  return { status, code, message, details: [], traceId: 't-1', userMessage: message };
}

describe('CheckoutPageComponent', () => {
  let api: jasmine.SpyObj<BookingApiService>;

  let fixture: ComponentFixture<CheckoutPageComponent>;

  function render(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [CheckoutPageComponent],
      providers: [
        { provide: BookingApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: ID }) } } },
      ],
    });
    fixture = TestBed.createComponent(CheckoutPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const click = (root: HTMLElement, label: string) => {
    Array.from(root.querySelectorAll('button')).find(b => b.textContent?.includes(label))!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<BookingApiService>('BookingApiService', ['getReservation', 'confirm']);
  });

  it('shows the summary of the held reservation with a Confirm button', () => {
    api.getReservation.and.returnValue(of(booking()));

    const root = render();

    expect(api.getReservation).toHaveBeenCalledOnceWith(ID);
    expect(root.textContent).toContain('Dune');
    expect(root.textContent).toContain('A1, A2');
    expect(root.textContent).toContain('Room 1');
    expect(root.querySelector('button')?.textContent).toContain('Confirm');
  });

  it('confirms the reservation and shows the success screen', () => {
    api.getReservation.and.returnValue(of(booking()));
    api.confirm.and.returnValue(of(booking({ status: 'CONFIRMED', expiresAt: null, confirmedAt: '2026-10-06T20:05:00Z' })));
    const root = render();

    click(root, 'Confirm');

    expect(api.confirm).toHaveBeenCalledOnceWith(ID, jasmine.stringMatching(/^[0-9a-f-]{36}$/));
    expect(root.querySelector('[role="status"].toast-success')?.textContent).toContain('Reservation confirmed');
    expect(root.querySelector('button')).toBeNull();
  });

  it('shows the answer of the backend when the reservation can no longer be confirmed', () => {
    api.getReservation.and.returnValue(of(booking()));
    api.confirm.and.returnValue(throwError(() => apiError(422, 'INVALID_STATUS_TRANSITION', 'The reservation has expired.')));
    const root = render();

    click(root, 'Confirm');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('The reservation has expired.');
    expect(root.querySelector('button')?.textContent).toContain('Confirm');
  });

  it('reuses the same Idempotency-Key when the same confirmation is retried', () => {
    api.getReservation.and.returnValue(of(booking()));
    const failing: Observable<Booking> = throwError(() => apiError(0, 'NETWORK_ERROR', 'The server cannot be reached.'));
    api.confirm.and.returnValue(failing);
    const root = render();

    click(root, 'Confirm');
    click(root, 'Confirm');

    const keys = api.confirm.calls.allArgs().map(args => args[1]);
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('offers no confirmation for an expired reservation', () => {
    api.getReservation.and.returnValue(of(booking({ status: 'EXPIRED', expiresAt: '2026-10-06T20:10:00Z' })));

    const root = render();

    expect(root.textContent).toContain('expired');
    expect(root.querySelector('button')).toBeNull();
  });

  it('shows an error with a retry when the reservation cannot be loaded', () => {
    api.getReservation.and.returnValue(throwError(() => apiError(404, 'NOT_FOUND', 'It does not exist, or it was removed.')));

    const root = render();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('It does not exist');
    expect(root.querySelector('button')?.textContent).toContain('Try again');
  });
});
