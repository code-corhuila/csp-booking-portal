import { Routes } from '@angular/router';
import { BookingApiService } from './data/booking-api.service';
import { ResilientBookingApiService } from './data/resilient-booking-api.service';
import { BookingLayoutComponent } from './layout/booking-layout.component';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    component: BookingLayoutComponent,
    // The list of reservations shows the burned-in sample of the demo when the service cannot answer
    providers: [{ provide: BookingApiService, useClass: ResilientBookingApiService }],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/booking-page.component').then(m => m.BookingPageComponent),
      },
      {
        path: 'showtime/:id',
        loadComponent: () => import('./pages/seat-map-page.component').then(m => m.SeatMapPageComponent),
      },
      {
        path: 'checkout/:id',
        loadComponent: () => import('./pages/checkout-page.component').then(m => m.CheckoutPageComponent),
      },
    ],
  },
];
