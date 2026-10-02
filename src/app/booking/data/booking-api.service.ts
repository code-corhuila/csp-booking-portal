import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Booking, BookingStatus, HoldRequest, HoldResponse, Page } from '../model/booking';

/**
 * Typed calls to this domain's endpoints. The injected HttpClient is the SHELL's:
 * its interceptor completes the '/api/v1/...' path, attaches the token and the
 * correlation id, applies the timeout and normalises every error.
 */
@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/booking';

  /** Create a temporary seat hold. */
  hold(body: HoldRequest, idempotencyKey: string): Observable<HoldResponse> {
    return this.http.post<HoldResponse>(`${this.base}/holds`, body, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
  }

  /** Get a reservation by ID. */
  getReservation(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/reservations/${encodeURIComponent(id)}`);
  }

  /** Confirm a held reservation. */
  confirm(id: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.base}/reservations/${encodeURIComponent(id)}/confirm`, null);
  }

  /** List reservations (for future HU). */
  list(page: number, limit: number, status?: BookingStatus): Observable<Page<Booking>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<Page<Booking>>(`${this.base}/reservations`, { params });
  }
}