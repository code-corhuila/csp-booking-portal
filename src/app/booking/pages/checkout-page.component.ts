import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { asApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking } from '../model/booking';

type View =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; booking: Booking };

/** /checkout/:id - summary of a hold and the confirmation of the reservation. */
@Component({
  selector: 'app-checkout-page',
  standalone: true,
  template: `
    <section aria-labelledby="checkout-title">
      <h1 id="checkout-title">Checkout</h1>

      @switch (view().state) {
        @case ('loading') { <p role="status">Loading reservation...</p> }
        @case ('error') {
          <div role="alert">
            <p>{{ errorMessage() }}</p>
            <button type="button" (click)="load()">Try again</button>
          </div>
        }
        @case ('ready') {
          @if (booking(); as b) {
            <dl>
              <dt>Movie</dt><dd>{{ b.movieTitleSnapshot }}</dd>
              <dt>Room</dt><dd>{{ b.roomNameSnapshot }}</dd>
              <dt>Seats</dt><dd>{{ b.seatLabels.join(', ') }}</dd>
              <dt>Status</dt><dd>{{ b.status }}</dd>
            </dl>

            @switch (b.status) {
              @case ('CONFIRMED') {
                <p class="toast toast-success" role="status">Reservation confirmed. Your seats are booked.</p>
              }
              @case ('EXPIRED') {
                <p role="alert">This reservation has expired and its seats were released.</p>
              }
              @default {
                <p>Hold expires at {{ b.expiresAt ? date(b.expiresAt) : '-' }}.</p>
                @if (failure()) { <p role="alert">{{ failure() }}</p> }
                <button type="button" [disabled]="pending()" [attr.aria-busy]="pending()" (click)="confirm()">
                  {{ pending() ? 'Confirming...' : 'Confirm reservation' }}
                </button>
              }
            }
          }
        }
      }
    </section>
  `,
})
export class CheckoutPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  // One key per intention: retrying the same confirmation reuses it
  private attemptKey: string | null = null;

  readonly view = signal<View>({ state: 'loading' });
  readonly pending = signal(false);
  readonly failure = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.view.set({ state: 'loading' });
    this.api.getReservation(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => this.view.set({ state: 'ready', booking }),
        error: (err: unknown) => this.view.set({ state: 'error', message: asApiError(err).userMessage }),
      });
  }

  confirm(): void {
    if (this.pending()) return;
    this.attemptKey ??= crypto.randomUUID();
    this.pending.set(true);
    this.failure.set(null);
    this.api.confirm(this.id, this.attemptKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => {
          this.pending.set(false);
          this.attemptKey = null;
          this.view.set({ state: 'ready', booking });
        },
        error: (err: unknown) => {
          this.pending.set(false);
          this.failure.set(asApiError(err).userMessage);
        },
      });
  }

  booking(): Booking | null {
    const v = this.view();
    return v.state === 'ready' ? v.booking : null;
  }

  errorMessage(): string {
    const v = this.view();
    return v.state === 'error' ? v.message : '';
  }

  date(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
