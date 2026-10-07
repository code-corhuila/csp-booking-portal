import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BOOKING_ROUTES } from '../booking.routes';
import { BookingLayoutComponent } from './booking-layout.component';

describe('BookingLayoutComponent', () => {
  it('wraps the portal in the scoped theme container and renders the routed page', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BookingLayoutComponent],
      providers: [provideRouter([])],
    }).createComponent(BookingLayoutComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('div.csp-booking router-outlet')).not.toBeNull();
  });

  it('loads the bookings page as a child of the layout', () => {
    const layout = BOOKING_ROUTES[0];

    expect(layout.component).toBe(BookingLayoutComponent);
    expect(layout.children?.[0].path).toBe('');
    expect(layout.children?.[0].loadComponent).toBeDefined();
  });
});
