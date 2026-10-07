import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { Booking, BookingStatus, Page } from '../model/booking';
import { BookingApiService } from './booking-api.service';
import { DemoModeService } from './demo-mode.service';
import { samplePage } from './sample-reservations';

/**
 * The booking API of the routes of this portal. The list of reservations falls back to the burned-in
 * sample of the product demo only when the service cannot answer (no answer, or a server error);
 * a real answer, including a refusal such as 401 or 422, is never replaced by samples. Hold,
 * confirmation and the rest are not simulated.
 */
@Injectable()
export class ResilientBookingApiService extends BookingApiService {
  private readonly demo = inject(DemoModeService);

  override list(page: number, limit: number, status?: BookingStatus, createdBefore?: string): Observable<Page<Booking>> {
    return super.list(page, limit, status, createdBefore).pipe(
      tap(() => this.demo.active.set(false)),
      catchError((err: unknown) => {
        const { status: httpStatus } = asApiError(err);
        if (httpStatus !== 0 && httpStatus < 500) return throwError(() => err);
        this.demo.active.set(true);
        return of(samplePage(page, limit, status, createdBefore));
      }),
    );
  }
}
