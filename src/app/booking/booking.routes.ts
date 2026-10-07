import { Routes } from '@angular/router';
import { BookingLayoutComponent } from './layout/booking-layout.component';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    component: BookingLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/booking-page.component').then(m => m.BookingPageComponent),
      },
    ],
  },
];
