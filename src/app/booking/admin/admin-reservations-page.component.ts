import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking, BookingStatus, Page } from '../model/booking';
import { STATUS_LABEL, formatDateTime } from '../model/labels';
import { formatCents } from '../model/money';

const LIMIT = 20;
const FORBIDDEN = 403;
const NO_PERMISSION_MESSAGE = 'No tienes permiso para ver todas las reservas.';

type View =
  | { state: 'loading' }
  | { state: 'forbidden' }
  | { state: 'error'; message: string }
  | { state: 'empty' }
  | { state: 'ready'; page: Page<Booking> };

/**
 * Administration view of the reservations of every user (12-ux-ui/wireframes.md, section 5), read from
 * `GET /admin/reservations` (`listAllReservations`, booking-service.yaml 3.5.0). The shell mounts it behind
 * `roleGuard('ADMIN')`; the service answers 403 to a token without `booking:read:all`.
 */
@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  template: `
    <section aria-labelledby="admin-title">
      <h1 id="admin-title">Todas las reservas</h1>

      <label for="status-filter">Estado</label>
      <select id="status-filter" [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">Todos</option>
        <option value="HELD">{{ label('HELD') }}</option>
        <option value="CONFIRMED">{{ label('CONFIRMED') }}</option>
        <option value="EXPIRED">{{ label('EXPIRED') }}</option>
      </select>

      @switch (view().state) {
        @case ('loading') { <p role="status">Cargando las reservas…</p> }
        @case ('forbidden') { <p role="alert">{{ noPermissionMessage }}</p> }
        @case ('error') {
          <div role="alert">
            <p>{{ errorMessage() }}</p>
            <button type="button" (click)="load()">Reintentar</button>
          </div>
        }
        @case ('empty') { <p>No hay reservas para mostrar.</p> }
        @case ('ready') {
          <table>
            <caption>Reservas de todos los usuarios, de la más reciente a la más antigua</caption>
            <thead>
              <tr>
                <th scope="col">Reserva</th>
                <th scope="col">Usuario</th>
                <th scope="col">Película</th>
                <th scope="col">Sala</th>
                <th scope="col">Función</th>
                <th scope="col">Asientos</th>
                <th scope="col">Estado</th>
                <th scope="col">Total</th>
                <th scope="col">Creada</th>
                <th scope="col">Confirmada</th>
              </tr>
            </thead>
            <tbody>
              @for (b of bookings(); track b.id) {
                <tr>
                  <td>{{ b.id }}</td>
                  <td>{{ b.userId }}</td>
                  <td>{{ b.movieTitleSnapshot }}</td>
                  <td>{{ b.roomNameSnapshot }}</td>
                  <td>{{ b.showtimeId }}</td>
                  <td>{{ b.seatLabels.join(', ') }}</td>
                  <td>{{ label(b.status) }}</td>
                  <td>{{ b.totalAmount === undefined ? '—' : price(b.totalAmount) }}</td>
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
export class AdminReservationsPageComponent {
  private readonly api = inject(BookingApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  protected readonly noPermissionMessage = NO_PERMISSION_MESSAGE;
  readonly page = signal(1);
  readonly status = signal<BookingStatus | ''>('');
  readonly view = signal<View>({ state: 'loading' });

  constructor() {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe(); // a newer request replaces an older one
    this.view.set({ state: 'loading' });
    this.request = this.api.listAll(this.page(), LIMIT, this.status() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.view.set(page.data.length ? { state: 'ready', page } : { state: 'empty' }),
        error: (err: unknown) => {
          const error = asApiError(err);
          this.view.set(error.status === FORBIDDEN
            ? { state: 'forbidden' }
            : { state: 'error', message: error.userMessage });
        },
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

  price(cents: number): string {
    return formatCents(cents);
  }
}
