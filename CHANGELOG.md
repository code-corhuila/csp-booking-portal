# Changelog

All notable changes of `csp-booking-portal` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning](https://semver.org/). A release is a `release/<version>` branch cut from `main` and filled with the commits of `qa`,
re-applied with `git cherry-pick -x` (numerals 6.2.3, 10 and 11 of the course norm); it reaches `main` by pull request, never by merging `qa`,
and is tagged `v<version>` once it is merged.

## [Unreleased]

## [2.0.0] - 2026-10-08

MVP 2 (Cut 2). Story HU-FE-BOOKING-001 ([#10](https://github.com/code-corhuila/csp-booking-portal/issues/10)): the client picks seats
on a showtime, holds them, confirms the reservation before the hold expires, and an administrator sees the reservations, all
against `csp-booking-api` contract 3.1.0.

### Added

- Dark Cinema Neon theme as a layout scoped under `.csp-booking`, so the shell and the other portals are not affected; a spec
  guards that every rule of the stylesheet stays scoped. ([#22](https://github.com/code-corhuila/csp-booking-portal/pull/22),
  [#34](https://github.com/code-corhuila/csp-booking-portal/pull/34))
- Seat map of a showtime that creates the hold with an `Idempotency-Key` and shows the countdown to its expiration.
  ([#24](https://github.com/code-corhuila/csp-booking-portal/pull/24))
- Seat conflict (`422`): the portal explains it and lets the client pick again with a new key.
  ([#25](https://github.com/code-corhuila/csp-booking-portal/pull/25))
- Checkout that confirms a held reservation; after a failed confirmation it reads the reservation again before offering a retry.
  ([#23](https://github.com/code-corhuila/csp-booking-portal/pull/23))
- Burned-in sample reservations shown when the Booking service cannot answer.
  ([#28](https://github.com/code-corhuila/csp-booking-portal/pull/28))
- Administration view of the reservations, exposed to the shell as its own federated entry `./admin-routes` (ADR-027); the shell
  applies the `ADMIN` role guard. ([#39](https://github.com/code-corhuila/csp-booking-portal/pull/39),
  [#45](https://github.com/code-corhuila/csp-booking-portal/pull/45))
- README with the routes, the shell contract and what is missing.
  ([#41](https://github.com/code-corhuila/csp-booking-portal/pull/41))

### Changed

- The portal follows `booking-service` contract 3.1.0. ([#7](https://github.com/code-corhuila/csp-booking-portal/pull/7))
- `ci.yml`, the `Dockerfile`, `compose.yml` and `nginx.conf` are normalized to LF.
  ([#46](https://github.com/code-corhuila/csp-booking-portal/pull/46))

### Fixed

- The shell can load the portal when it runs as a container: nginx answers `Access-Control-Allow-Origin` for the origins allowed by
  `CORS_ALLOWED_ORIGIN_REGEX`, which the container renders when it starts (ADR-026, amended on 2026-10-08).
  ([#47](https://github.com/code-corhuila/csp-booking-portal/pull/47))

### Known limits

- There is no gateway: the shell calls `http://localhost:8000`, `csp-api-gateway` holds only its seeded README and
  `csp-booking-api` has no CORS configuration. The flow was verified against the real API through a temporary local proxy.
- The administration view uses sample data: contract 3.1.0 has no route to list the reservations of other users.
- A client cannot release a hold: the contract has no such route, so a hold ends by confirmation or expiration.
- Showtimes come from a constant, not from Catalog.
- Several files that existed before this release are committed with CRLF (`git ls-files --eol` shows them as `i/-text`) and are
  normalized one pull request at a time ([#30](https://github.com/code-corhuila/csp-booking-portal/issues/30)).

## [0.1.0] - 2026-10-05

### Added

- Governance files, the Angular 21 and Native Federation project configuration and the standalone runtime.
