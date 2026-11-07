import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { BookingFormComponent } from '../components/booking-form.component';
import { BookingApiService } from '../data/booking-api.service';
import { CatalogApiService } from '../data/catalog-api.service';
import { BillboardItem } from '../model/catalog';
import { formatCents } from '../model/money';
import { Booking, BookingStatus, Page } from '../model/booking';
import { STATUS_LABEL, formatDateTime } from '../model/labels';
import { Router } from '@angular/router';

const LIMIT = 20;

/** Every view that loads data has four states, and all four are designed. */
type View =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'empty' }
  | { state: 'ready'; page: Page<Booking> };

type ShowtimeView =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'empty' }
  | { state: 'ready'; items: BillboardItem[] };

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [BookingFormComponent],
  template: `
    <section aria-labelledby="bookings-title">
      <h1 id="bookings-title">Mis reservas y retenciones</h1>

      <section aria-labelledby="showtimes-title">
        <h2 id="showtimes-title">Funciones disponibles</h2>
        @switch (showtimeView().state) {
          @case ('loading') { <p role="status">Cargando funciones…</p> }
          @case ('error') {
            <div role="alert">
              <p>{{ showtimeError() }}</p>
              <button type="button" (click)="loadShowtimes()">Reintentar</button>
            </div>
          }
          @case ('empty') { <p>No hay funciones disponibles.</p> }
          @case ('ready') {
            <div class="showtimes" role="list">
              @for (item of showtimes(); track item.showtime.id) {
                <article role="listitem">
                  <h3>{{ item.movie.title }}</h3>
                  <p>{{ item.room.name }} · {{ date(item.showtime.startsAt) }}</p>
                  <p>{{ formatPrice(item.showtime.priceCents) }}</p>
                  <button type="button" (click)="selectShowtime(item.showtime.id)">Elegir asientos</button>
                </article>
              }
            </div>
          }
        }
      </section>

      <app-booking-form (holdCreated)="onHoldCreated($event)" />
      @if (notice()) { <p role="status">{{ notice() }}</p> }

      <label for="status-filter">Estado</label>
      <select id="status-filter" [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">Todos</option>
        <option value="HELD">{{ label('HELD') }}</option>
        <option value="CONFIRMED">{{ label('CONFIRMED') }}</option>
        <option value="EXPIRED">{{ label('EXPIRED') }}</option>
      </select>

      @switch (view().state) {
        @case ('loading') { <p role="status">Cargando tus reservas…</p> }
        @case ('error') {
          <div role="alert">
            <p>{{ errorMessage() }}</p>
            <button type="button" (click)="load()">Reintentar</button>
          </div>
        }
        @case ('empty') { <p>Aún no tienes reservas.</p> }
        @case ('ready') {
          <table>
            <caption>Tus reservas, de la más reciente a la más antigua</caption>
            <thead>
              <tr>
                <th scope="col">Reserva</th>
                <th scope="col">Función</th>
                <th scope="col">Asientos</th>
                <th scope="col">Película</th>
                <th scope="col">Sala</th>
                <th scope="col">Estado</th>
                <th scope="col">Creada</th>
                <th scope="col">Confirmada</th>
              </tr>
            </thead>
            <tbody>
              @for (b of bookings(); track b.id) {
                <tr>
                  <td>{{ b.id }}</td>
                  <td>{{ b.showtimeId }}</td>
                  <td>{{ b.seatLabels.join(', ') }}</td>
                  <td>{{ b.movieTitleSnapshot }}</td>
                  <td>{{ b.roomNameSnapshot }}</td>
                  <td>{{ label(b.status) }}</td>
                  <td>{{ date(b.createdAt) }}</td>
                  <td>{{ b.confirmedAt ? date(b.confirmedAt) : 'Sin confirmar' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <nav aria-label="Páginas">
            <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Anterior</button>
            <span>Página {{ page() }} de {{ totalPages() }}</span>
            <button type="button" [disabled]="page() >= totalPages()" (click)="go(page() + 1)">Siguiente</button>
          </nav>
        }
      }
    </section>
  `,
})
export class BookingPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly catalog = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private request?: Subscription;
  private showtimeRequest?: Subscription;

  readonly page = signal(1);
  readonly status = signal<BookingStatus | ''>('');
  readonly view = signal<View>({ state: 'loading' });
  readonly showtimeView = signal<ShowtimeView>({ state: 'loading' });
  readonly notice = signal<string | null>(null);

  constructor() {
    this.load();
    this.loadShowtimes();
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

  loadShowtimes(): void {
    this.showtimeRequest?.unsubscribe();
    this.showtimeView.set({ state: 'loading' });
    this.showtimeRequest = this.catalog.getBillboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.showtimeView.set(
          page.data.length ? { state: 'ready', items: page.data } : { state: 'empty' },
        ),
        error: (err: unknown) => this.showtimeView.set({ state: 'error', message: asApiError(err).userMessage }),
      });
  }

  showtimes(): BillboardItem[] {
    const view = this.showtimeView();
    return view.state === 'ready' ? view.items : [];
  }

  showtimeError(): string {
    const view = this.showtimeView();
    return view.state === 'error' ? view.message : '';
  }

  selectShowtime(showtimeId: string): void {
    void this.router.navigate(['booking', 'showtime', showtimeId]);
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
    this.notice.set(`Retención ${id} creada.`);
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

  label(status: BookingStatus): string {
    return STATUS_LABEL[status];
  }

  date(iso: string): string {
    return formatDateTime(iso);
  }

  formatPrice(cents: number): string {
    return formatCents(cents);
  }
}
