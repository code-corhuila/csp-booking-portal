import { Routes } from '@angular/router';
import { ADMIN_ROUTES } from './booking/admin/admin.routes';
import { BOOKING_ROUTES } from './booking/booking.routes';

/**
 * Standalone runs only. Mounts the two federated entries as the shell does: the customer entry at the root
 * and the administration entry at its documented address (navigation-map.md, ADR-027).
 */
export const STANDALONE_ROUTES: Routes = [
  ...BOOKING_ROUTES,
  { path: 'admin/reservations', children: ADMIN_ROUTES },
];
