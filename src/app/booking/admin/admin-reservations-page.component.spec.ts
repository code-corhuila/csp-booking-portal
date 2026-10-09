import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminReservationsPageComponent } from './admin-reservations-page.component';

describe('AdminReservationsPageComponent', () => {
  let fixture: ComponentFixture<AdminReservationsPageComponent>;
  let root: HTMLElement;

  const rows = () => root.querySelectorAll('tbody tr');
  const click = (selector: string) => {
    (root.querySelector(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  const filterBy = (status: string) => {
    const select = root.querySelector('select') as HTMLSelectElement;
    select.value = status;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(Date.UTC(2026, 9, 8, 12, 0, 0)));
    fixture = TestBed.createComponent(AdminReservationsPageComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });
  afterEach(() => jasmine.clock().uninstall());

  it('says that the reservations are sample data', () => {
    expect(root.querySelector('.demo-notice[role="status"]')?.textContent).toContain('sample data');
  });

  it('shows how many reservations there are in each status', () => {
    const cards = Array.from(root.querySelectorAll('.summary-card')).map(
      (card) => `${card.querySelector('.summary-label')!.textContent} ${card.querySelector('strong')!.textContent}`,
    );

    expect(cards).toEqual(['Active hold 3', 'Confirmed 6', 'Expired 3']);
  });

  it('lists the first page of reservations of all users, ten at a time', () => {
    expect(rows().length).toBe(10);
    expect(root.querySelector('nav')?.textContent).toContain('Page 1 of 2');
    expect(root.querySelector<HTMLButtonElement>('nav button:first-of-type')!.disabled).toBeTrue();
  });

  it('moves to the next page and back', () => {
    click('nav button:last-of-type');

    expect(rows().length).toBe(2);
    expect(root.querySelector('nav')?.textContent).toContain('Page 2 of 2');
    expect(root.querySelector<HTMLButtonElement>('nav button:last-of-type')!.disabled).toBeTrue();

    click('nav button:first-of-type');
    expect(rows().length).toBe(10);
  });

  it('filters by status, goes back to the first page and keeps the summary of everything', () => {
    click('nav button:last-of-type');

    filterBy('CONFIRMED');

    expect(rows().length).toBe(6);
    expect(Array.from(rows()).every((row) => row.textContent!.includes('Confirmed'))).toBeTrue();
    expect(root.querySelector('nav')?.textContent).toContain('Page 1 of 1');
    expect(root.querySelectorAll('.summary-card').length).toBe(3);
    expect(root.querySelector('.summary-card')?.textContent).toContain('3');
  });

  it('shows all of them again when the filter is cleared', () => {
    filterBy('EXPIRED');
    expect(rows().length).toBe(3);

    filterBy('');
    expect(rows().length).toBe(10);
  });

  it('offers no action on a reservation: it is read only', () => {
    expect(root.querySelectorAll('tbody button').length).toBe(0);
  });
});
