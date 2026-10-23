import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoModeService } from '../data/demo-mode.service';

/**
 * Parent of every booking route. The portal runs inside the shell as a federated
 * remote that exposes only its routes, so the design tokens of
 * csp-docs/12-ux-ui/design-system.md travel here, scoped under `.csp-booking`,
 * and never leak into the shell or the other portals.
 */
@Component({
  selector: 'app-booking-layout',
  standalone: true,
  imports: [RouterOutlet],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './booking-layout.component.css',
  template: `
    <div class="csp-booking">
      @if (demo.active()) {
        <p class="demo-notice" role="status">
          Estás viendo datos de ejemplo: el servicio de Reservas no respondió, así que las reservas de abajo son un ejemplo.
        </p>
      }
      <router-outlet />
    </div>
  `,
})
export class BookingLayoutComponent {
  protected readonly demo = inject(DemoModeService);
}
