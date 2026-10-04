import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { asApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';

type FormField = 'showtimeId' | 'seatLabels' | 'movieTitle' | 'roomName';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="new-hold-title">
      <h2 id="new-hold-title">Create hold</h2>

      <label for="showtimeId">Showtime ID</label>
      <input id="showtimeId" formControlName="showtimeId" autocomplete="off"
             [attr.aria-invalid]="shows('showtimeId')" [attr.aria-describedby]="shows('showtimeId') ? 'showtimeId-error' : null" />
      @if (shows('showtimeId')) {
        <p id="showtimeId-error">{{ serverError('showtimeId') ?? 'Enter the showtime id (a UUID).' }}</p>
      }

      <label for="seatLabels">Seat labels (comma-separated)</label>
      <input id="seatLabels" formControlName="seatLabels" autocomplete="off"
             [attr.aria-invalid]="shows('seatLabels')" [attr.aria-describedby]="shows('seatLabels') ? 'seatLabels-error' : null" />
      @if (shows('seatLabels')) {
        <p id="seatLabels-error">{{ serverError('seatLabels') ?? 'Enter one or more seat labels separated by commas.' }}</p>
      }

      <label for="movieTitle">Movie title</label>
      <input id="movieTitle" formControlName="movieTitle" autocomplete="off"
             [attr.aria-invalid]="shows('movieTitle')" [attr.aria-describedby]="shows('movieTitle') ? 'movieTitle-error' : null" />
      @if (shows('movieTitle')) {
        <p id="movieTitle-error">{{ serverError('movieTitle') }}</p>
      }

      <label for="roomName">Room name</label>
      <input id="roomName" formControlName="roomName" autocomplete="off"
             [attr.aria-invalid]="shows('roomName')" [attr.aria-describedby]="shows('roomName') ? 'roomName-error' : null" />
      @if (shows('roomName')) {
        <p id="roomName-error">{{ serverError('roomName') }}</p>
      }

      <button type="submit" [disabled]="pending()" [attr.aria-busy]="pending()">
        {{ pending() ? 'Creating hold...' : 'Create hold' }}
      </button>
      @if (failure()) { <p role="alert">{{ failure() }}</p> }
    </form>
  `,
})
export class BookingFormComponent {
  readonly holdCreated = output<string>(); // emits hold ID
  private readonly api = inject(BookingApiService);
  readonly form = inject(NonNullableFormBuilder).group({
    showtimeId: ['', [Validators.required, Validators.pattern(UUID)]],
    seatLabels: ['', [Validators.required]], // comma-separated labels
    movieTitle: [''], // Cut 2 snapshot: the API says if it is required
    roomName: [''],
  });
  readonly pending = signal(false);
  readonly failure = signal<string | null>(null);
  // One key per intention: a retry of the same data reuses it
  private attemptKey: string | null = null;

  constructor() {
    this.form.valueChanges.subscribe(() => (this.attemptKey = null));
  }

  shows(name: FormField): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  serverError(name: FormField): string | null {
    return this.form.controls[name].errors?.['server'] ?? null;
  }

  submit(): void {
    this.form.markAllAsTouched();
    const seatLabels = this.form.controls.seatLabels.value.trim();
    const seatLabelsArray = seatLabels.split(',').map(s => s.trim()).filter(Boolean);
    if (seatLabelsArray.length === 0) {
      this.form.controls.seatLabels.setErrors({ required: true });
    }

    if (this.form.invalid || this.pending()) return;

    this.attemptKey ??= crypto.randomUUID();
    this.pending.set(true);
    this.failure.set(null);

    const movieTitle = this.form.controls.movieTitle.value.trim();
    const roomName = this.form.controls.roomName.value.trim();

    this.api.hold(
      {
        showtimeId: this.form.controls.showtimeId.value.trim(),
        seatLabels: seatLabelsArray,
        ...(movieTitle && { movieTitle }),
        ...(roomName && { roomName }),
      },
      this.attemptKey
    ).subscribe({
      next: ({ id }) => {
        this.pending.set(false);
        this.form.reset();
        this.attemptKey = null;
        this.holdCreated.emit(id);
      },
      error: (err: unknown) => {
        const error = asApiError(err);
        this.pending.set(false);
        // Map server field errors to form controls
        const fields: Record<string, FormField> = {
          showtimeId: 'showtimeId',
          seatLabels: 'seatLabels',
          movieTitle: 'movieTitle',
          roomName: 'roomName',
        };
        for (const d of error.details) {
          const control = fields[d.field] && this.form.controls[fields[d.field]];
          control?.setErrors({ server: d.message });
        }
        this.failure.set(error.userMessage);
      },
    });
  }
}