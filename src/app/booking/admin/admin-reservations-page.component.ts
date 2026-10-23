import { Component, computed, signal } from '@angular/core';
import { BookingStatus } from '../model/booking';
import { STATUS_LABEL, formatDateTimeLong, formatTime } from '../model/labels';
import { adminReservationsPage, sampleAdminReservations, statusCounts } from '../data/sample-admin-reservations';

const LIMIT = 10;

/**
 * Administration view of the reservations of every user, read only (12-ux-ui/wireframes.md, section 5).
 * The Booking contract has no endpoint for it yet, so it shows a sample and says so.
 */
@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  template: `
    <section aria-labelledby="admin-title">
      <h1 id="admin-title">Reservas</h1>
      <p class="demo-notice" role="status">
        Mostrando datos de ejemplo: el servicio de Reservas todavía no puede listar las reservas de todos los usuarios.
      </p>

      <ul class="summary" aria-label="Reservas por estado">
        @for (entry of summary(); track entry.status) {
          <li class="summary-card">
            <span class="summary-label">{{ entry.label }}</span>
            <strong>{{ entry.count }}</strong>
          </li>
        }
      </ul>

      <label for="admin-status-filter">Estado</label>
      <select id="admin-status-filter" [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">Todos</option>
        @for (entry of summary(); track entry.status) {
          <option [value]="entry.status">{{ entry.label }}</option>
        }
      </select>

      @if (current().data.length === 0) {
        <p>Ninguna reserva coincide con este estado.</p>
      } @else {
        <table>
          <caption>Reservas de todos los usuarios, de la más reciente a la más antigua</caption>
          <thead>
            <tr>
              <th scope="col">Estado</th>
              <th scope="col">Reserva</th>
              <th scope="col">Película</th>
              <th scope="col">Sala</th>
              <th scope="col">Asientos</th>
              <th scope="col">Creada</th>
              <th scope="col">Vence</th>
            </tr>
          </thead>
          <tbody>
            @for (b of current().data; track b.id) {
              <tr>
                <td>{{ label(b.status) }}</td>
                <td>{{ b.id }}</td>
                <td>{{ b.movieTitleSnapshot }}</td>
                <td>{{ b.roomNameSnapshot }}</td>
                <td>{{ b.seatLabels.join(', ') }}</td>
                <td>{{ createdAt(b.createdAt) }}</td>
                <td>{{ b.expiresAt ? expiresAt(b.expiresAt) : 'No aplica' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <nav aria-label="Páginas">
          <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Anterior</button>
          <span>Página {{ page() }} de {{ current().meta.totalPages }}</span>
          <button type="button" [disabled]="page() >= current().meta.totalPages" (click)="go(page() + 1)">Siguiente</button>
        </nav>
      }
    </section>
  `,
})
export class AdminReservationsPageComponent {
  private readonly now = Date.now();

  protected readonly status = signal<BookingStatus | ''>('');
  protected readonly page = signal(1);

  protected readonly summary = computed(() => {
    const counts = statusCounts(sampleAdminReservations(this.now));
    return (Object.keys(STATUS_LABEL) as BookingStatus[]).map((status) => ({
      status,
      label: STATUS_LABEL[status],
      count: counts[status],
    }));
  });

  protected readonly current = computed(() =>
    adminReservationsPage(this.page(), LIMIT, this.status() || undefined, this.now),
  );

  protected label(status: BookingStatus): string {
    return STATUS_LABEL[status];
  }

  protected createdAt(iso: string): string {
    return formatDateTimeLong(iso);
  }

  protected expiresAt(iso: string): string {
    return formatTime(iso);
  }

  protected filter(value: BookingStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
  }

  protected go(page: number): void {
    this.page.set(page);
  }
}
