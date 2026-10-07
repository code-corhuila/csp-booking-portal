import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
                @if (secondsLeft() === 0) {
                  <p role="alert">The hold time is over and the seats will be released.</p>
                  <button type="button" class="btn-secondary" (click)="chooseSeatsAgain(b.showtimeId)">Choose seats again</button>
                } @else {
                  <p role="timer">Time left to confirm: {{ clock(secondsLeft()) }}</p>
                  @if (failure()) { <p role="alert">{{ failure() }}</p> }
                  <button type="button" [disabled]="pending()" [attr.aria-busy]="pending()" (click)="confirm()">
                    {{ pending() ? 'Confirming...' : 'Confirm reservation' }}
                  </button>
                }
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private id = '';
  private request?: Subscription;
  // One key per intention: retrying the same confirmation reuses it
  private attemptKey: string | null = null;

  readonly view = signal<View>({ state: 'loading' });
  readonly pending = signal(false);
  readonly failure = signal<string | null>(null);
  private readonly now = signal(Date.now());
  /** Whole seconds until the hold expires; null when there is nothing to count down. */
  readonly secondsLeft = computed(() => {
    const b = this.booking();
    if (b?.status !== 'HELD' || !b.expiresAt) return null;
    return Math.max(0, Math.ceil((Date.parse(b.expiresAt) - this.now()) / 1000));
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    // The router reuses this component when only :id changes, so the id is read reactively
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.attemptKey = null;
        this.pending.set(false);
        this.failure.set(null);
        this.load();
      });
  }

  load(): void {
    this.request?.unsubscribe(); // a newer request replaces an older one
    this.view.set({ state: 'loading' });
    this.request = this.api.getReservation(this.id)
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
    this.request?.unsubscribe();
    this.request = this.api.confirm(this.id, this.attemptKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => {
          this.pending.set(false);
          this.attemptKey = null;
          this.view.set({ state: 'ready', booking });
        },
        error: (err: unknown) => this.reconcile(asApiError(err).userMessage),
      });
  }

  /**
   * A failed confirmation does not tell whether the backend applied it: the response may have
   * been lost after the transition. Read the reservation again before offering a retry.
   */
  private reconcile(message: string): void {
    this.request = this.api.getReservation(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => {
          this.pending.set(false);
          this.view.set({ state: 'ready', booking });
          if (booking.status === 'HELD') this.failure.set(message);
        },
        error: () => {
          this.pending.set(false);
          this.failure.set(message);
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

  clock(seconds: number | null): string {
    const total = seconds ?? 0;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  chooseSeatsAgain(showtimeId: string): void {
    void this.router.navigate(['../../showtime', showtimeId], { relativeTo: this.route });
  }
}
