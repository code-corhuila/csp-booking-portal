import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { Booking, Page } from '../model/booking';
import { DemoModeService } from './demo-mode.service';
import { ResilientBookingApiService } from './resilient-booking-api.service';

/** What the shell does: every failed request reaches the portal as an ApiError. */
const asTheShell: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) =>
      throwError(() => ({
        status: err.status,
        code: err.status === 0 ? 'NETWORK_ERROR' : `HTTP_${err.status}`,
        message: err.statusText,
        details: [],
        traceId: 't-1',
        userMessage: err.statusText,
      } satisfies ApiError)),
    ),
  );

const REAL_PAGE: Page<Booking> = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

describe('ResilientBookingApiService', () => {
  let service: ResilientBookingApiService;
  let demo: DemoModeService;
  let http: HttpTestingController;
  let received: Page<Booking> | undefined;
  let failure: unknown;

  const listAndAnswer = (answer: (req: ReturnType<HttpTestingController['expectOne']>) => void, status?: 'HELD' | 'CONFIRMED') => {
    received = undefined;
    failure = undefined;
    service.list(1, 20, status).subscribe({ next: (p) => (received = p), error: (e) => (failure = e) });
    answer(http.expectOne((r) => r.url === '/api/v1/booking/reservations'));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ResilientBookingApiService, provideHttpClient(withInterceptors([asTheShell])), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResilientBookingApiService);
    demo = TestBed.inject(DemoModeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('passes the real answer through and does not enter the demo mode', () => {
    listAndAnswer((req) => req.flush(REAL_PAGE));

    expect(received).toEqual(REAL_PAGE);
    expect(demo.active()).toBeFalse();
  });

  it('falls back to the sample reservations when the service gives no answer', () => {
    listAndAnswer((req) => req.error(new ProgressEvent('error'), { status: 0 }));

    expect(received?.data.map((r) => r.status)).toEqual(['HELD', 'CONFIRMED', 'EXPIRED']);
    expect(failure).toBeUndefined();
    expect(demo.active()).toBeTrue();
  });

  it('falls back on a server error such as the 503 of an unavailable service', () => {
    listAndAnswer((req) => req.flush('down', { status: 503, statusText: 'Service Unavailable' }));

    expect(received?.data.length).toBe(3);
    expect(demo.active()).toBeTrue();
  });

  it('applies the status filter to the sample reservations', () => {
    listAndAnswer((req) => req.flush('down', { status: 502, statusText: 'Bad Gateway' }), 'CONFIRMED');

    expect(received?.data.map((r) => r.status)).toEqual(['CONFIRMED']);
  });

  for (const status of [400, 401, 403, 404, 422]) {
    it(`never replaces a real ${status} answer with samples`, () => {
      listAndAnswer((req) => req.flush('no', { status, statusText: 'Real answer' }));

      expect(received).toBeUndefined();
      expect((failure as ApiError).status).toBe(status);
      expect(demo.active()).toBeFalse();
    });
  }

  it('leaves the demo mode as soon as a real answer arrives', () => {
    listAndAnswer((req) => req.error(new ProgressEvent('error'), { status: 0 }));
    expect(demo.active()).toBeTrue();

    listAndAnswer((req) => req.flush(REAL_PAGE));

    expect(demo.active()).toBeFalse();
  });
});
