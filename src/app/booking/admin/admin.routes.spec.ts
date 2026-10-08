import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BOOKING_ROUTES } from '../booking.routes';
import { BookingLayoutComponent } from '../layout/booking-layout.component';
import { STANDALONE_ROUTES } from '../../standalone.routes';
import { ADMIN_ROUTES } from './admin.routes';

describe('the administration entry (ADR-027)', () => {
  it('is its own route table: the layout and the lazy reservations page, with no guard of the portal', () => {
    expect(ADMIN_ROUTES.length).toBe(1);
    expect(ADMIN_ROUTES[0].component).toBe(BookingLayoutComponent);
    expect(ADMIN_ROUTES[0].canActivate).toBeUndefined();
    expect(ADMIN_ROUTES[0].children?.[0].path).toBe('');
    expect(ADMIN_ROUTES[0].children?.[0].loadComponent).toBeDefined();
  });

  it('keeps the customer table free of administration screens', () => {
    const paths = (BOOKING_ROUTES[0].children ?? []).map((child) => child.path);

    expect(paths).toEqual(['', 'showtime/:id', 'checkout/:id']);
  });
});

describe('standalone routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(STANDALONE_ROUTES)] }));

  it('mounts the administration entry at its documented address', async () => {
    const harness = await RouterTestingHarness.create('/admin/reservations');

    expect(TestBed.inject(Router).url).toBe('/admin/reservations');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Reservations');
  });

  it('keeps the customer entry at the root, apart from the administration address', () => {
    expect(STANDALONE_ROUTES[0]).toBe(BOOKING_ROUTES[0]);
    expect(STANDALONE_ROUTES[1].path).toBe('admin/reservations');
    expect(STANDALONE_ROUTES[1].children).toBe(ADMIN_ROUTES);
  });
});
