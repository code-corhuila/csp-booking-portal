import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { SEAT_CONFLICT_MESSAGE, formatDateTime } from '../model/labels';
import { MapSeat, SeatMap, groupByRow } from '../model/seat-map';

type MapState = 'loading' | 'ready' | 'missing' | 'failed';

/** /showtime/:id - pick seats on the real map and create the temporary hold (ADR-046). */
@Component({
  selector: 'app-seat-map-page',
  standalone: true,
  template: `
    <section aria-labelledby="seatmap-title">
      <h1 id="seatmap-title">Elige tus asientos</h1>

      @switch (state()) {
        @case ('loading') {
          <p role="status">Cargando el mapa de asientos…</p>
        }
        @case ('missing') {
          <p role="alert">Esta función no existe.</p>
        }
        @case ('failed') {
          <p role="alert">{{ mapFailure() }}</p>
          <button type="button" (click)="retry()">Reintentar</button>
        }
        @case ('ready') {
          @if (seatMap(); as s) {
            <p>{{ s.roomName }} · {{ s.movieTitle }} · {{ startsAt(s.startsAt) }}</p>

            <div class="screen-container">
              <div class="screen"></div>
              <p class="screen-text">Pantalla</p>
            </div>

            <div class="seat-rows" role="group" aria-label="Mapa de asientos">
              @for (row of rows(); track $index) {
                <div class="seats-row">
                  <span class="row-name" aria-hidden="true">{{ row.name }}</span>
                  @for (seat of row.seats; track seat.label) {
                    <button type="button" class="seat" [class.selected]="isSelected(seat.label)"
                            [class.held]="seat.status === 'HELD'" [class.occupied]="seat.status === 'CONFIRMED'"
                            [disabled]="seat.status !== 'AVAILABLE'" [attr.aria-pressed]="isSelected(seat.label)"
                            [attr.aria-label]="seatDescription(seat)" (click)="toggle(seat)">{{ seat.label }}</button>
                  }
                </div>
              }
            </div>

            <div class="seats-legend">
              <span class="legend-item"><i class="legend-box" style="background: var(--seat-available)"></i>Disponible</span>
              <span class="legend-item"><i class="legend-box" style="background: var(--seat-selected)"></i>Elegido</span>
              <span class="legend-item"><i class="legend-box" style="background: var(--seat-held)"></i>Retenido</span>
              <span class="legend-item"><i class="legend-box" style="background: var(--seat-occupied)"></i>Ocupado</span>
            </div>

            <p role="status">{{ selectedLabels().length ? 'Elegidos: ' + selectedLabels().join(', ') : 'No has elegido asientos.' }}</p>
            @if (failure()) { <p role="alert">{{ failure() }}</p> }

            <button type="button" [disabled]="!selectedLabels().length || pending()" [attr.aria-busy]="pending()" (click)="hold()">
              {{ pending() ? 'Reteniendo asientos…' : 'Retener asientos' }}
            </button>
          }
        }
      }
    </section>
  `,
})
export class SeatMapPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private mapRequest?: Subscription;
  private request?: Subscription;
  private showtimeId: string | null = null;
  // One key per intention: retrying the same selection reuses it
  private attemptKey: string | null = null;

  readonly seatMap = signal<SeatMap | undefined>(undefined);
  readonly state = signal<MapState>('loading');
  readonly mapFailure = signal<string | null>(null);
  private readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly pending = signal(false);
  readonly failure = signal<string | null>(null);
  readonly rows = computed(() => groupByRow(this.seatMap()?.seats ?? []));
  /** Selected labels in map order, which is what the API receives. */
  readonly selectedLabels = computed(() =>
    (this.seatMap()?.seats ?? []).filter((seat) => this.selected().has(seat.label)).map((seat) => seat.label),
  );

  constructor() {
    // The router reuses this component when only :id changes, so the id is read reactively
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.request?.unsubscribe();
      this.showtimeId = params.get('id');
      this.seatMap.set(undefined);
      this.selected.set(new Set());
      this.pending.set(false);
      this.failure.set(null);
      this.attemptKey = null;
      this.load(false);
    });
  }

  startsAt(iso: string): string {
    return formatDateTime(iso);
  }

  isSelected(label: string): boolean {
    return this.selected().has(label);
  }

  seatDescription(seat: MapSeat): string {
    const suffix = { AVAILABLE: '', HELD: ', retenido', CONFIRMED: ', ocupado' }[seat.status];
    return `Asiento ${seat.label}${suffix}`;
  }

  toggle(seat: MapSeat): void {
    // The map is a view: a taken seat is not offered, and the hold stays the authority
    if (seat.status !== 'AVAILABLE') return;
    const next = new Set(this.selected());
    if (!next.delete(seat.label)) next.add(seat.label);
    this.selected.set(next);
    this.attemptKey = null;
  }

  retry(): void {
    this.load(false);
  }

  hold(): void {
    const map = this.seatMap();
    if (!map || this.pending() || !this.selectedLabels().length) return;
    this.attemptKey ??= crypto.randomUUID();
    this.pending.set(true);
    this.failure.set(null);
    this.request = this.api
      .hold(
        {
          showtimeId: map.showtimeId,
          seatLabels: this.selectedLabels(),
          movieTitle: map.movieTitle,
          roomName: map.roomName,
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
            // The API holds every seat or none: the client only has to pick again, on a map that shows what was taken
            this.selected.set(new Set());
            this.attemptKey = null;
            this.failure.set(SEAT_CONFLICT_MESSAGE);
            this.load(true);
          } else {
            this.failure.set(error.userMessage);
          }
        },
      });
  }

  /** Reads the map of the showtime of the route; a refresh keeps the drawn map and ignores its own failure. */
  private load(refresh: boolean): void {
    const id = this.showtimeId;
    this.mapRequest?.unsubscribe();
    if (!id) {
      this.state.set('missing');
      return;
    }
    if (!refresh) {
      this.state.set('loading');
      this.mapFailure.set(null);
    }
    this.mapRequest = this.api
      .getSeatMap(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (map) => {
          this.seatMap.set(map);
          this.state.set('ready');
        },
        error: (err: unknown) => {
          if (refresh) return;
          const error = asApiError(err);
          this.mapFailure.set(error.userMessage);
          this.state.set(error.status === 404 ? 'missing' : 'failed');
        },
      });
  }
}
