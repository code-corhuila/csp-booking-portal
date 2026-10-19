import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { SYNTHETIC_SHOWTIMES, SyntheticShowtime } from '../data/synthetic-showtimes';
import { SEAT_CONFLICT_MESSAGE, formatDateTime } from '../model/labels';

/** /showtime/:id - pick seats on the map and create the temporary hold. */
@Component({
  selector: 'app-seat-map-page',
  standalone: true,
  template: `
    <section aria-labelledby="seatmap-title">
      <h1 id="seatmap-title">Elige tus asientos</h1>

      @if (showtime(); as s) {
        <p>{{ s.roomName }} · {{ s.movieTitle }} · {{ startsAt(s.startsAt) }}</p>

        <div class="screen-container">
          <div class="screen"></div>
          <p class="screen-text">Pantalla</p>
        </div>

        <div class="seats-grid" role="group" aria-label="Mapa de asientos">
          @for (label of s.seatLabels; track label) {
            <button type="button" class="seat" [class.selected]="isSelected(label)"
                    [attr.aria-pressed]="isSelected(label)" [attr.aria-label]="'Asiento ' + label"
                    (click)="toggle(label)">{{ label }}</button>
          }
        </div>

        <div class="seats-legend">
          <span class="legend-item"><i class="legend-box" style="background: var(--seat-available)"></i>Disponible</span>
          <span class="legend-item"><i class="legend-box" style="background: var(--seat-selected)"></i>Elegido</span>
        </div>

        <p role="status">{{ selectedLabels().length ? 'Elegidos: ' + selectedLabels().join(', ') : 'No has elegido asientos.' }}</p>
        @if (failure()) { <p role="alert">{{ failure() }}</p> }

        <button type="button" [disabled]="!selectedLabels().length || pending()" [attr.aria-busy]="pending()" (click)="hold()">
          {{ pending() ? 'Reteniendo asientos…' : 'Retener asientos' }}
        </button>
      } @else {
        <p role="alert">Esta función no existe.</p>
      }
    </section>
  `,
})
export class SeatMapPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private request?: Subscription;
  // One key per intention: retrying the same selection reuses it
  private attemptKey: string | null = null;

  readonly showtime = signal<SyntheticShowtime | undefined>(undefined);
  private readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly pending = signal(false);
  readonly failure = signal<string | null>(null);
  /** Selected labels in map order, which is what the API receives. */
  readonly selectedLabels = computed(() =>
    (this.showtime()?.seatLabels ?? []).filter((label) => this.selected().has(label)),
  );

  constructor() {
    // The router reuses this component when only :id changes, so the id is read reactively
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.request?.unsubscribe();
      this.showtime.set(SYNTHETIC_SHOWTIMES.find((s) => s.id === params.get('id')));
      this.selected.set(new Set());
      this.pending.set(false);
      this.failure.set(null);
      this.attemptKey = null;
    });
  }

  startsAt(iso: string): string {
    return formatDateTime(iso);
  }

  isSelected(label: string): boolean {
    return this.selected().has(label);
  }

  toggle(label: string): void {
    const next = new Set(this.selected());
    if (!next.delete(label)) next.add(label);
    this.selected.set(next);
    this.attemptKey = null;
  }

  hold(): void {
    const showtime = this.showtime();
    if (!showtime || this.pending() || !this.selectedLabels().length) return;
    this.attemptKey ??= crypto.randomUUID();
    this.pending.set(true);
    this.failure.set(null);
    this.request = this.api
      .hold(
        {
          showtimeId: showtime.id,
          seatLabels: this.selectedLabels(),
          movieTitle: showtime.movieTitle,
          roomName: showtime.roomName,
        },
        this.attemptKey,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ id }) => {
          this.pending.set(false);
          void this.router.navigate(['../../checkout', id], { relativeTo: this.route });
        },
        error: (err: unknown) => {
          const error = asApiError(err);
          this.pending.set(false);
          // The contract answers a seat conflict with this pair; any other status is an ordinary failure
          if (error.status === 422 && error.code === 'BUSINESS_RULE_VIOLATION') {
            // The API holds every seat or none: the client only has to pick again
            this.selected.set(new Set());
            this.attemptKey = null;
            this.failure.set(SEAT_CONFLICT_MESSAGE);
          } else {
            this.failure.set(error.userMessage);
          }
        },
      });
  }
}
