import { Routes } from '@angular/router';
import { BookingLayoutComponent } from '../layout/booking-layout.component';
import { adminGuard } from './admin.guard';

/**
 * Administration area of Booking (role ADMIN), exposed as `./admin-routes`. It is a table of its own because
 * customer and staff screens are never declared in the same one (ADR-027). The shell mounts it at
 * /admin/reservations, as csp-docs/12-ux-ui/navigation-map.md documents.
 *
 * The guard is the portal's own until the shell mounts this entry behind its role guard (csp-front#15);
 * from then on it, and the token reading it uses, are deleted (csp-booking-portal#38).
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: BookingLayoutComponent,
    canActivate: [adminGuard],
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
