import { TestBed } from '@angular/core/testing';
import { AdminReservationsPageComponent } from './admin-reservations-page.component';

describe('AdminReservationsPageComponent', () => {
  let root: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(AdminReservationsPageComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('titles the screen in Spanish', () => {
    expect(root.querySelector('h1')?.textContent).toBe('Reservas');
  });

  it('says that the view is not available yet, as a status', () => {
    expect(root.querySelector('[role="status"]')?.textContent).toContain('todavía no está disponible');
  });

  it('shows no reservation, no summary and no action: there is no route to read them', () => {
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelector('.summary')).toBeNull();
    expect(root.querySelectorAll('button').length).toBe(0);
    expect(root.textContent).not.toContain('ejemplo');
  });
});
