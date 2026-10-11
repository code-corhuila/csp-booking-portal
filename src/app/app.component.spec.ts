import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('AppComponent', () => {
  it('creates the root component', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
