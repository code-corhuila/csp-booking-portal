import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingApiService } from './booking-api.service';

describe('BookingApiService', () => {
  let service: BookingApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BookingApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BookingApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a hold request with its idempotency key', () => {
    const body = { showtimeId: 'showtime-1', seatLabels: ['A1', 'A2'] };
    service.hold(body, 'hold-key').subscribe();

    const request = http.expectOne('/api/v1/booking/holds');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Idempotency-Key')).toBe('hold-key');
    request.flush({ id: 'reservation-1' });
  });

  it('sends confirmation with its idempotency key and no body', () => {
    service.confirm('reservation-1', 'confirm-key').subscribe();

    const request = http.expectOne('/api/v1/booking/reservations/reservation-1/confirm');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Idempotency-Key')).toBe('confirm-key');
    request.flush({ id: 'reservation-1' });
  });

  it('encodes reservation IDs and sends list filters', () => {
    service.getReservation('reservation/1').subscribe();
    const reservationRequest = http.expectOne('/api/v1/booking/reservations/reservation%2F1');
    expect(reservationRequest.request.method).toBe('GET');
    reservationRequest.flush({ id: 'reservation/1' });

    service.list(2, 20, 'HELD').subscribe();
    const listRequest = http.expectOne(request =>
      request.url === '/api/v1/booking/reservations'
      && request.params.get('page') === '2'
      && request.params.get('limit') === '20'
      && request.params.get('status') === 'HELD'
    );
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush({ data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } });
  });

  it('sends the createdBefore filter only when it is given', () => {
    service.list(1, 20, undefined, '2026-10-04T12:00:00Z').subscribe();
    const filtered = http.expectOne(request => request.params.get('createdBefore') === '2026-10-04T12:00:00Z');
    filtered.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    service.list(1, 20).subscribe();
    const plain = http.expectOne(request => request.url === '/api/v1/booking/reservations');
    expect(plain.request.params.has('createdBefore')).toBe(false);
    plain.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });
});
