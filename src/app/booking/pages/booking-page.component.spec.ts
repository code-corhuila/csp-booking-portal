import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking, Page } from '../model/booking';
import { BookingPageComponent } from './booking-page.component';

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    showtimeId: '33333333-3333-4333-8333-333333333333',
    seatLabels: ['A1', 'A2'],
    status: 'HELD',
    userId: 'user-1',
    expiresAt: '2026-10-06T20:10:00Z',
    movieTitleSnapshot: 'Dune',
    roomNameSnapshot: 'Room 1',
    totalAmount: 0,
    createdAt: '2026-10-06T20:00:00Z',
    confirmedAt: null,
    ...overrides,
  };
}

function page(data: Booking[], totalPages = 1): Page<Booking> {
  return { data, meta: { page: 1, limit: 20, total: data.length, totalPages } };
}

function apiError(message: string): ApiError {
  return { status: 0, code: 'NETWORK_ERROR', message, details: [], traceId: 't-1', userMessage: message };
}

describe('BookingPageComponent', () => {
  let api: jasmine.SpyObj<BookingApiService>;
  let fixture: ComponentFixture<BookingPageComponent>;

  function render(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [BookingPageComponent],
      providers: [{ provide: BookingApiService, useValue: api }],
    });
    fixture = TestBed.createComponent(BookingPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    api = jasmine.createSpyObj<BookingApiService>('BookingApiService', ['list', 'hold']);
  });

  it('titles the screen and the filter in Spanish and offers the statuses by their Spanish name', () => {
    api.list.and.returnValue(of(page([booking()])));

    const root = render();

    expect(root.querySelector('h1')?.textContent).toContain('Mis reservas y retenciones');
    expect(root.querySelector('label[for="status-filter"]')?.textContent).toBe('Estado');
    expect(Array.from(root.querySelectorAll('#status-filter option')).map((option) => option.textContent)).toEqual([
      'Todos',
      'Retención activa',
      'Confirmada',
      'Vencida',
    ]);
  });

  it('lists a booking with Spanish headers and the Spanish word of its status, never the API value', () => {
    api.list.and.returnValue(of(page([
      booking(),
      booking({ id: '22222222-2222-4222-8222-222222222222', status: 'CONFIRMED', confirmedAt: '2026-10-06T20:05:00Z' }),
    ])));

    const root = render();

    expect(Array.from(root.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual([
      'Reserva', 'Función', 'Asientos', 'Película', 'Sala', 'Estado', 'Creada', 'Confirmada',
    ]);
    const rows = Array.from(root.querySelectorAll('tbody tr')).map((row) => row.textContent);
    expect(rows[0]).toContain('Retención activa');
    expect(rows[0]).toContain('Sin confirmar');
    expect(rows[1]).toContain('Confirmada');
    expect(root.textContent).not.toContain('HELD');
    expect(root.textContent).not.toContain('CONFIRMED');
  });

  it('writes the dates the way Colombia does', () => {
    api.list.and.returnValue(of(page([booking({ createdAt: '2026-10-08T12:00:00Z' })])));

    const root = render();

    expect(root.querySelector('tbody tr')?.textContent).toMatch(/8\/10\/2026, \d{1,2}:\d{2}/);
  });

  it('says that there are no bookings yet', () => {
    api.list.and.returnValue(of(page([])));

    const root = render();

    expect(root.textContent).toContain('Aún no tienes reservas.');
  });

  it('shows the error of the shell with a retry that loads again', () => {
    api.list.and.returnValues(throwError(() => apiError('No se pudo contactar al servidor.')), of(page([booking()])));
    const root = render();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo contactar al servidor.');
    const retry = root.querySelector<HTMLButtonElement>('[role="alert"] button');
    expect(retry?.textContent).toBe('Reintentar');

    retry!.click();
    fixture.detectChanges();

    expect(api.list).toHaveBeenCalledTimes(2);
    expect(root.querySelector('tbody tr')).not.toBeNull();
  });

  it('pages in Spanish and keeps the buttons inside the bounds', () => {
    api.list.and.returnValue(of(page([booking()], 2)));

    const root = render();

    const nav = root.querySelector('nav[aria-label="Páginas"]');
    expect(nav?.textContent).toContain('Página 1 de 2');
    const [previous, next] = Array.from(nav!.querySelectorAll('button'));
    expect(previous.textContent).toBe('Anterior');
    expect(previous.disabled).toBeTrue();
    expect(next.textContent).toBe('Siguiente');
    expect(next.disabled).toBeFalse();
  });
});
