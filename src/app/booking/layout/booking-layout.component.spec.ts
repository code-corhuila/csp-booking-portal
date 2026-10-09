import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BOOKING_ROUTES } from '../booking.routes';
import { BookingApiService } from '../data/booking-api.service';
import { DemoModeService } from '../data/demo-mode.service';
import { ResilientBookingApiService } from '../data/resilient-booking-api.service';
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

  it('says that the data is a sample while the demo mode is active, and only then', () => {
    TestBed.configureTestingModule({ imports: [BookingLayoutComponent], providers: [provideRouter([])] });
    const demo = TestBed.inject(DemoModeService);
    const fixture = TestBed.createComponent(BookingLayoutComponent);
    const root: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    expect(root.querySelector('.demo-notice')).toBeNull();

    demo.active.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.demo-notice[role="status"]')?.textContent).toContain('sample data');

    demo.active.set(false);
    fixture.detectChanges();
    expect(root.querySelector('.demo-notice')).toBeNull();
  });

  it('registers the fallback service for the booking API in the booking routes', () => {
    const provided = BOOKING_ROUTES[0].providers as { provide: unknown; useClass: unknown }[];

    expect(provided).toContain(jasmine.objectContaining({ provide: BookingApiService, useClass: ResilientBookingApiService }));
  });

  it('loads the bookings page as a child of the layout', () => {
    const layout = BOOKING_ROUTES[0];

    expect(layout.component).toBe(BookingLayoutComponent);
    expect(layout.children?.[0].path).toBe('');
    expect(layout.children?.[0].loadComponent).toBeDefined();
  });
});
