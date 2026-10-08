import { Routes } from '@angular/router';
import { BookingLayoutComponent } from '../layout/booking-layout.component';

/**
 * Administration area of Booking (role ADMIN), exposed as `./admin-routes`. It is a table of its own because
 * customer and staff screens are never declared in the same one (ADR-027). The shell mounts it at
 * /admin/reservations behind `roleGuard('ADMIN')`, as csp-docs/12-ux-ui/navigation-map.md documents
 * (csp-front#27), so the portal checks no role and reads no token. Run alone, the portal has no session.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: BookingLayoutComponent,
    children: [
      {
        path: '',
        title: 'Reservations',
        loadComponent: () =>
          import('./admin-reservations-page.component').then(m => m.AdminReservationsPageComponent),
      },
    ],
  },
];
