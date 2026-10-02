import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { BookingFormComponent } from '../components/booking-form.component';
import { BookingApiService } from '../data/booking-api.service';
import { formatCents } from '../model/money';
import { Booking, BookingStatus, Page } from '../model/booking';

const LIMIT = 20;

/** Every view that loads data has four states, and all four are designed. */
type View =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'empty' }
  | { state: 'ready'; page: Page<Booking> };

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [BookingFormComponent],
  template: `
    <section aria-labelledby="bookings-title">
      <h1 id="bookings-title">My bookings and holds</h1>

      <app-booking-form (holdCreated)="onHoldCreated($event)" />
      @if (notice()) { <p role="status">{{ notice() }}</p> }

      <label for="status-filter">Status</label>
      <select id="status-filter" [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">All</option>
        <option value="HELD">Active hold</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="EXPIRED">Expired</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      @switch (view().state) {
        @case ('loading') { <p role="status">Loading bookings?</p> }
        @case ('error') {
          <div role="alert">
            <p>{{ errorMessage() }}</p>
            <button type="button" (click)="load()">Try again</button>
          </div>
        }
        @case ('empty') { <p>You have no bookings yet.</p> }
        @case ('ready') {
          <table>
            <caption>Bookings, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Booking</th>
                <th scope="col">Showtime</th>
                <th scope="col">Seats</th>
                <th scope="col">Movie</th>
                <th scope="col">Room</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">Confirmed</th>
              </tr>
            </thead>
            <tbody>
              @for (b of bookings(); track b.id) {
                <tr>
                  <td>{{ b.id }}</td>
                  <td>{{ b.showtimeId }}</td>
                  <td>{{ b.seatIds.join(', ') }}</td>
                  <td>{{ b.movieTitleSnapshot }}</td>
                  <td>{{ b.roomNameSnapshot }}</td>
                  <td>{{ b.status }}</td>
                  <td>{{ date(b.createdAt) }}</td>
                  <td>{{ b.confirmedAt ? date(b.confirmedAt) : '?' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <nav aria-label="Pages">
            <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button type="button" [disabled]="page() >= totalPages()" (click)="go(page() + 1)">Next</button>
          </nav>
        }
      }
    </section>
  `,
})
export class BookingPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  readonly page = signal(1);
  readonly status = signal<BookingStatus | ''>('');
  readonly view = signal<View>({ state: 'loading' });
  readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe(); // a newer request replaces an older one
    this.view.set({ state: 'loading' });
    this.request = this.api.list(this.page(), LIMIT, this.status() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.view.set(page.data.length ? { state: 'ready', page } : { state: 'empty' }),
        error: (err: unknown) => this.view.set({ state: 'error', message: asApiError(err).userMessage }),
      });
  }

  filter(value: string): void {
    this.status.set(value as BookingStatus | '');
    this.page.set(1);
    this.load();
  }

  go(page: number): void {
    this.page.set(page);
    this.load();
  }

  onHoldCreated(id: string): void {
    this.notice.set(`Hold ${id} created.`);
    this.load();
  }

  bookings(): Booking[] {
    const v = this.view();
    return v.state === 'ready' ? v.page.data : [];
  }

  totalPages(): number {
    const v = this.view();
    return v.state === 'ready' ? v.page.meta.totalPages : 1;
  }

  errorMessage(): string {
    const v = this.view();
    return v.state === 'error' ? v.message : '';
  }

  date(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}