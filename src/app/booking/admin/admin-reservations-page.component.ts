import { DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { BookingStatus } from '../model/booking';
import { adminReservationsPage, sampleAdminReservations, statusCounts } from '../data/sample-admin-reservations';

const LIMIT = 10;

const STATUS_LABEL: Record<BookingStatus, string> = {
  HELD: 'Active hold',
  CONFIRMED: 'Confirmed',
  EXPIRED: 'Expired',
};

/**
 * Administration view of the reservations of every user, read only (12-ux-ui/wireframes.md, section 5).
 * The Booking contract has no endpoint for it yet, so it shows a sample and says so.
 */
@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section aria-labelledby="admin-title">
      <h1 id="admin-title">Reservations</h1>
      <p class="demo-notice" role="status">
        Showing sample data: the Booking service cannot yet list the reservations of every user.
      </p>

      <ul class="summary" aria-label="Reservations by status">
        @for (entry of summary(); track entry.status) {
          <li class="summary-card">
            <span class="summary-label">{{ entry.label }}</span>
            <strong>{{ entry.count }}</strong>
          </li>
        }
      </ul>

      <label for="admin-status-filter">Status</label>
      <select id="admin-status-filter" [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">All</option>
        @for (entry of summary(); track entry.status) {
          <option [value]="entry.status">{{ entry.label }}</option>
        }
      </select>

      @if (current().data.length === 0) {
        <p>No reservations match this status.</p>
      } @else {
        <table>
          <caption>Reservations of all users, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Reservation</th>
              <th scope="col">Movie</th>
              <th scope="col">Room</th>
              <th scope="col">Seats</th>
              <th scope="col">Created</th>
              <th scope="col">Expires</th>
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
                <td>{{ b.createdAt | date: 'medium' }}</td>
                <td>{{ b.expiresAt ? (b.expiresAt | date: 'shortTime') : 'Not applicable' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <nav aria-label="Pages">
          <button type="button" [disabled]="page() <= 1" (click)="go(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ current().meta.totalPages }}</span>
          <button type="button" [disabled]="page() >= current().meta.totalPages" (click)="go(page() + 1)">Next</button>
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

  protected filter(value: BookingStatus | ''): void {
    this.status.set(value);
    this.page.set(1);
  }

  protected go(page: number): void {
    this.page.set(page);
  }
}
