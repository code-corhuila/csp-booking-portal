import { Routes } from '@angular/router';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/booking-page.component').then(m => m.BookingPageComponent),
  },
];
