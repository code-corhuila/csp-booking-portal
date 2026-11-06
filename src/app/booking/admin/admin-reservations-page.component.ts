import { Component } from '@angular/core';

/**
 * Administration view of the reservations of every user (12-ux-ui/wireframes.md, section 5).
 * The Booking contract has no route to list the reservations of other users yet, so the view says
 * that it is not available and shows no reservation; it reads the route when the contract has it.
 */
@Component({
  selector: 'app-admin-reservations-page',
  standalone: true,
  template: `
    <section aria-labelledby="admin-title">
      <h1 id="admin-title">Reservas</h1>
      <p role="status">
        Esta vista todavía no está disponible: el servicio de Reservas aún no puede listar las reservas de todos los usuarios.
      </p>
    </section>
  `,
})
export class AdminReservationsPageComponent {}
