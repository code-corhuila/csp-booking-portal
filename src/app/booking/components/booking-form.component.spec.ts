import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { BookingApiService } from '../data/booking-api.service';
import { BookingFormComponent } from './booking-form.component';

const SHOWTIME = '11111111-1111-4111-8111-111111111111';

describe('BookingFormComponent', () => {
  let component: BookingFormComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    component = TestBed.createComponent(BookingFormComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the title and room snapshot of Cut 2 when they are filled', () => {
    component.form.setValue({ showtimeId: SHOWTIME, seatLabels: 'A1, A2', movieTitle: ' Movie ', roomName: 'Room 1' });
    component.submit();

    const request = http.expectOne('/api/v1/booking/holds');
    expect(request.request.body).toEqual({
      showtimeId: SHOWTIME,
      seatLabels: ['A1', 'A2'],
      movieTitle: 'Movie',
      roomName: 'Room 1',
    });
    request.flush({ id: 'reservation-1' });
  });

  it('leaves the snapshot out of the request when it is empty', () => {
    component.form.setValue({ showtimeId: SHOWTIME, seatLabels: 'A1', movieTitle: '', roomName: '  ' });
    component.submit();

    const request = http.expectOne('/api/v1/booking/holds');
    expect(request.request.body).toEqual({ showtimeId: SHOWTIME, seatLabels: ['A1'] });
    request.flush({ id: 'reservation-1' });
  });

  it('shows the field errors that the shell reports for the snapshot', () => {
    const api = TestBed.inject(BookingApiService);
    spyOn(api, 'hold').and.returnValue(throwError(() => ({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'the request has invalid fields',
      details: [{ field: 'movieTitle', message: 'required' }],
      traceId: 't',
      userMessage: 'Check the highlighted fields.',
    })));
    component.form.setValue({ showtimeId: SHOWTIME, seatLabels: 'A1', movieTitle: '', roomName: '' });
    component.submit();

    expect(component.form.controls.movieTitle.errors?.['server']).toBe('required');
    expect(component.failure()).toBe('Check the highlighted fields.');
  });
});
