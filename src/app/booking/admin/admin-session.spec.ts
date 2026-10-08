import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { isAdminToken } from './admin-session';

/** An unsigned token with the given payload: the portal only reads it to decide what to show. */
function tokenWith(payload: unknown): string {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

describe('isAdminToken', () => {
  it('is true when the roles claim holds ADMIN', () => {
    expect(isAdminToken(tokenWith({ sub: 'u', roles: ['CLIENT', 'ADMIN'] }))).toBeTrue();
  });

  it('is false for a client, a missing roles claim and a roles claim that is not a list', () => {
    expect(isAdminToken(tokenWith({ sub: 'u', roles: ['CLIENT'] }))).toBeFalse();
    expect(isAdminToken(tokenWith({ sub: 'u' }))).toBeFalse();
    expect(isAdminToken(tokenWith({ sub: 'u', roles: 'ADMIN' }))).toBeFalse();
  });

  it('is false when there is no token or it cannot be read', () => {
    expect(isAdminToken(null)).toBeFalse();
    expect(isAdminToken('')).toBeFalse();
    expect(isAdminToken('not-a-token')).toBeFalse();
    expect(isAdminToken('a.@@@.c')).toBeFalse();
    expect(isAdminToken(`a.${btoa('not json')}.c`)).toBeFalse();
  });
});

describe('adminGuard', () => {
  const KEY = 'csp.session.token';

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  afterEach(() => sessionStorage.removeItem(KEY));

  const run = () => TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

  it('lets an administrator in', () => {
    sessionStorage.setItem(KEY, tokenWith({ sub: 'u', roles: ['ADMIN'] }));

    expect(run()).toBeTrue();
  });

  it('sends a client and a visitor to the billboard, as the navigation map says', () => {
    sessionStorage.setItem(KEY, tokenWith({ sub: 'u', roles: ['CLIENT'] }));
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(run() as UrlTree)).toBe('/movies');

    sessionStorage.removeItem(KEY);
    expect(router.serializeUrl(run() as UrlTree)).toBe('/movies');
  });
});
