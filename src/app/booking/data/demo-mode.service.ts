import { Injectable, signal } from '@angular/core';

/** Whether the portal is showing burned-in sample data because the Booking service did not answer. */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
  readonly active = signal(false);
}
