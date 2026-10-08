import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BOOKING_ROUTES } from '../booking.routes';
import { BookingLayoutComponent } from '../layout/booking-layout.component';
import { STANDALONE_ROUTES } from '../../standalone.routes';
import { ADMIN_ROUTES } from './admin.routes';
import { adminGuard } from './admin.guard';

const KEY = 'csp.session.token';

function tokenWith(payload: unknown): string {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

describe('the administration entry (ADR-027)', () => {
  it('is its own route table: the layout, the administrator guard and the lazy reservations page', () => {
    expect(ADMIN_ROUTES.length).toBe(1);
    expect(ADMIN_ROUTES[0].component).toBe(BookingLayoutComponent);
    expect(ADMIN_ROUTES[0].canActivate).toEqual([adminGuard]);
    expect(ADMIN_ROUTES[0].children?.[0].path).toBe('');
    expect(ADMIN_ROUTES[0].children?.[0].loadComponent).toBeDefined();
  });

  it('keeps the customer table free of administration screens', () => {
    const paths = (BOOKING_ROUTES[0].children ?? []).map((child) => child.path);

    expect(paths).toEqual(['', 'showtime/:id', 'checkout/:id']);
  });
});

describe('standalone routes', () => {
  let router: Router;

  beforeEach(() => {
    // the billboard belongs to the Catalog portal: a stub stands for it so the redirect of the guard has a target
    TestBed.configureTestingModule({ providers: [provideRouter([...STANDALONE_ROUTES, { path: 'movies', children: [] }])] });
    router = TestBed.inject(Router);
  });
  afterEach(() => sessionStorage.removeItem(KEY));

  it('mounts the administration entry at its documented address for an administrator', async () => {
    sessionStorage.setItem(KEY, tokenWith({ sub: 'u', roles: ['ADMIN'] }));

    const harness = await RouterTestingHarness.create('/admin/reservations');

    expect(router.url).toBe('/admin/reservations');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Reservations');
  });

  it('does not show the administration screen to a client', async () => {
    sessionStorage.setItem(KEY, tokenWith({ sub: 'u', roles: ['CLIENT'] }));

    const harness = await RouterTestingHarness.create('/admin/reservations');

    expect(router.url).toBe('/movies');
    expect((harness.routeNativeElement as HTMLElement | null)?.textContent ?? '').not.toContain('Reservations');
  });

  it('keeps the customer entry at the root, apart from the administration address', () => {
    expect(STANDALONE_ROUTES[0]).toBe(BOOKING_ROUTES[0]);
    expect(STANDALONE_ROUTES[1].path).toBe('admin/reservations');
    expect(STANDALONE_ROUTES[1].children).toBe(ADMIN_ROUTES);
  });
});
