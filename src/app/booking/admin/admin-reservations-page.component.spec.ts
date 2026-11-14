import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { BookingApiService } from '../data/booking-api.service';
import { Booking, Page } from '../model/booking';
import { formatCents } from '../model/money';
import { AdminReservationsPageComponent } from './admin-reservations-page.component';

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    showtimeId: '33333333-3333-4333-8333-333333333333',
    seatLabels: ['A1', 'A2'],
    status: 'CONFIRMED',
    userId: '22222222-2222-4222-8222-222222222222',
    expiresAt: null,
    movieTitleSnapshot: 'Dune',
    roomNameSnapshot: 'Room 1',
    totalAmount: 2500000,
    createdAt: '2026-10-06T20:00:00Z',
    confirmedAt: '2026-10-06T20:05:00Z',
    ...overrides,
  };
}

function page(data: Booking[], totalPages = 1): Page<Booking> {
  return { data, meta: { page: 1, limit: 20, total: data.length, totalPages } };
}

function apiError(status: number, userMessage: string): ApiError {
  return { status, code: 'ERR', message: userMessage, details: [], traceId: 't-1', userMessage };
}

function cells(root: HTMLElement): (string | undefined)[] {
  return Array.from(root.querySelectorAll('tbody td')).map((td) => td.textContent?.trim());
}

describe('AdminReservationsPageComponent', () => {
  let api: jasmine.SpyObj<BookingApiService>;
  let fixture: ComponentFixture<AdminReservationsPageComponent>;

  function render(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [AdminReservationsPageComponent],
      providers: [{ provide: BookingApiService, useValue: api }],
    });
    fixture = TestBed.createComponent(AdminReservationsPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    api = jasmine.createSpyObj<BookingApiService>('BookingApiService', ['listAll']);
  });

  it('titles the screen in Spanish and no longer says that it is not available', () => {
    api.listAll.and.returnValue(of(page([booking()])));

    const root = render();

    expect(root.querySelector('h1')?.textContent).toBe('Todas las reservas');
    expect(root.textContent).not.toContain('todavía no está disponible');
  });

  it('asks for the first page of the administration list without a filter', () => {
    api.listAll.and.returnValue(of(page([])));

    render();

    expect(api.listAll).toHaveBeenCalledOnceWith(1, 20, undefined);
  });

  it('shows the loading state while the list is read', () => {
    api.listAll.and.returnValue(new Observable<Page<Booking>>());

    const root = render();

    expect(root.querySelector('[role="status"]')?.textContent).toContain('Cargando');
    expect(root.querySelector('table')).toBeNull();
  });

  it('lists the reservation, its user, function, seats, status and amount in Spanish, never the API status', () => {
    api.listAll.and.returnValue(of(page([booking()])));

    const root = render();

    expect(Array.from(root.querySelectorAll('th')).map((th) => th.textContent)).toEqual([
      'Reserva', 'Usuario', 'Película', 'Sala', 'Función', 'Asientos', 'Estado', 'Total', 'Creada', 'Confirmada',
    ]);
    expect(cells(root).slice(0, 8)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'Dune',
      'Room 1',
      '33333333-3333-4333-8333-333333333333',
      'A1, A2',
      'Confirmada',
      formatCents(2500000),
    ]);
    expect(root.textContent).not.toContain('CONFIRMED');
  });

  it('shows a dash for a missing amount and says that a hold is not confirmed', () => {
    api.listAll.and.returnValue(of(page([booking({ status: 'HELD', confirmedAt: null, totalAmount: undefined })])));

    const row = cells(render());

    expect(row[6]).toBe('Retención activa');
    expect(row[7]).toBe('—');
    expect(row[9]).toBe('Sin confirmar');
  });

  it('says that there are no reservations when the page is empty', () => {
    api.listAll.and.returnValue(of(page([])));

    const root = render();

    expect(root.textContent).toContain('No hay reservas');
    expect(root.querySelector('table')).toBeNull();
  });

  it('filters by status from the first page', () => {
    api.listAll.and.returnValue(of(page([booking()], 3)));
    const root = render();
    api.listAll.calls.reset();

    const select = root.querySelector('#status-filter') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Todos', 'Retención activa', 'Confirmada', 'Vencida',
    ]);
    select.value = 'EXPIRED';
    select.dispatchEvent(new Event('change'));

    expect(api.listAll).toHaveBeenCalledOnceWith(1, 20, 'EXPIRED');
  });

  it('pages and keeps the buttons inside the bounds', () => {
    api.listAll.and.returnValue(of(page([booking()], 2)));
    const root = render();
    const [previous, next] = Array.from(root.querySelectorAll('nav button')) as HTMLButtonElement[];

    expect(root.querySelector('nav')?.textContent).toContain('Página 1 de 2');
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    api.listAll.calls.reset();
    next.click();

    expect(api.listAll).toHaveBeenCalledOnceWith(2, 20, undefined);
  });

  it('reads a 403 as a missing permission, without a retry', () => {
    api.listAll.and.returnValue(throwError(() => apiError(403, 'Forbidden')));

    const root = render();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No tienes permiso para ver todas las reservas');
    expect(root.querySelector('button')).toBeNull();
  });

  it('shows any other failure with a retry that reads the list again', () => {
    api.listAll.and.returnValues(
      throwError(() => apiError(503, 'El servicio no está disponible.')),
      of(page([booking()])),
    );

    const root = render();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible.');

    (root.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.listAll).toHaveBeenCalledTimes(2);
    expect(root.querySelector('table')).not.toBeNull();
  });
});
