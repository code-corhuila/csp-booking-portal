import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isAdminToken, sessionToken } from './admin-session';

/** Routes under /admin are for the ADMIN role; anyone else goes to the billboard (12-ux-ui/navigation-map.md). */
export const adminGuard: CanActivateFn = () =>
  isAdminToken(sessionToken()) ? true : inject(Router).createUrlTree(['/movies']);
