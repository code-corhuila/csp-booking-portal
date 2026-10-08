# csp-booking-portal

> booking bounded context: web UI (remote)

Part of the **Cinesync Platform** distributed system — team `cinesync-platform`, Group 1.
Governance and documentation live in [`csp-docs`](https://github.com/code-corhuila/csp-docs).

## Purpose

`csp-booking-portal` is the **remote of the booking domain** of the web application: the client picks seats on a map,
holds them for a few minutes, confirms the reservation and reads their own reservations. It talks to
[`csp-booking-api`](https://github.com/code-corhuila/csp-booking-api) and to nothing else.

It is not an application on its own. The shell (`csp-front`) owns the page, the session, the gateway URL, the HTTP
client and the error handling; this portal only exposes its routes to the shell. It does not define `GATEWAY_URL`, it
does not sign anyone in and it does not store a token.

## Stack

| Item | Decision |
|---|---|
| Framework | Angular 21, standalone components, signals, zoneless change detection |
| Federation | Native Federation: the remote is named `booking` and exposes `./routes` (`federation.config.js`) |
| Build and test | Angular CLI, Karma with Jasmine, ESLint; Node `^22.12.0 || >=24.0.0` |
| Container | `deploy/Dockerfile` (NGINX); `deploy/compose.yml` publishes it on port `4202` |

## Routes

The shell mounts the remote under `/booking` (it loads `http://localhost:4202/remoteEntry.json`).

| Route | What it does |
|---|---|
| `/booking` | "My bookings and holds": the reservations of the caller, with the four states of a view (loading, empty, error, data) |
| `/booking/showtime/:id` | The seat map of a showtime: select seats and create the temporary hold; a seat taken by another client is explained and the client picks again |
| `/booking/checkout/:id` | The summary of a hold with the countdown to its expiration, and the confirmation of the reservation |
| `/booking/admin/reservations` | Reservations view for the `ADMIN` role, **with sample data** (see [What is missing](#what-is-missing)); anyone else is sent to `/movies` |

## Build, test and run

Requirements: Node 22.12 or later (24 works) and a Chrome for the tests.

```bash
npm ci                                      # install from the lockfile
npm run build                               # production build in dist/csp-booking-portal
npm run lint
npm test -- --browsers=ChromeHeadless       # 90 specs, one run
npm start                                   # development server and remote on http://localhost:4202
```

`npm start` serves `http://localhost:4202/remoteEntry.json`, which is what the shell asks for. **To use the portal, run
it through the shell** (`csp-front`, see its README): standalone it has no HTTP client on purpose
(`src/app/app.config.ts`), so the pages that call the API cannot work alone. In the shell, the booking remote is listed
in `public/federation.manifest.json` as `booking`.

The federation build rewrites `tsconfig.federation.json` (it lists the shared packages there) when you run `npm run build`
or `npm start`: `git checkout -- tsconfig.federation.json` before you commit, because that change is not part of yours.

With Docker, from the root of the repository:

```bash
docker build -f deploy/Dockerfile -t csp-booking-portal .
```

The shell loads this portal from another origin, so the container renders its CORS rule from the
environment when it starts (ADR-026) and refuses to start without it:

| Variable | Meaning | Development value |
|---|---|---|
| `CORS_ALLOWED_ORIGIN_REGEX` | Origins allowed to load `remoteEntry.json` and the modules of the portal | `^http://localhost:420[0-5]$` |

`deploy/compose.yml` sets the development value when the variable is not defined. CI builds the image
and checks that it answers the allowed origin, stays silent for any other, and does not start without the variable.

## How it reaches the API

Every request goes through the HTTP client **of the shell**. The portal writes only the path
(`/api/v1/booking/holds`, `/reservations`, `/reservations/{id}/confirm`, as `booking-service.yaml` declares them) and the
shell's interceptor completes the URL, adds the bearer token and the `X-Correlation-Id`, applies the timeout and turns
every failure into an `ApiError` (`src/app/shell-contract.ts`, kept in step with `csp-front`). The token travels as the
`csp.session.token` value of `sessionStorage`; the portal only reads it, to know whether to show the admin route, and the
API is the one that validates it.

- The `Idempotency-Key` of the hold and of the confirmation is a `crypto.randomUUID()` per intention. It is reused while
  the same request is retried and renewed when the selection, the reservation or a conflict changes.
- After a failed confirmation the portal reads the reservation again before it offers a retry, because the answer may
  have been lost after the API applied the transition.
- The API can only be reached through the gateway; see below.

## Cut 2 data

- **Showtimes are synthetic.** Catalog has no backend yet, so `src/app/booking/data/synthetic-showtimes.ts` mirrors the
  showtimes of `csp-catalog-portal` (same ids, titles, room and seats `A1` to `F8`). The title and the room travel with the
  hold request, which is what the API requires while it runs without Catalog (`totalAmount` is `0`).
- **The list falls back to a burned-in sample** (`sample-reservations.ts`) **only** when the API does not answer or
  answers a server error, and a banner says so. A real answer, including a refusal such as `401` or `422`, is never
  replaced. Hold and confirmation are never simulated.

## Look and scope

The theme (`Dark Cinema Neon`) lives in a layout component with `ViewEncapsulation.None`, with every rule under
`.csp-booking`, so loading the remote cannot restyle the shell or another portal. A spec fails when a rule leaves that
scope. A global `styles.css` would not reach the shell, because only `./routes` is exposed.

## Where the data is

This portal stores nothing: reservations live in the `booking` schema behind `csp-booking-api`, and the session lives in
the shell. `.env.example` only documents that the port of the development server is configured in `angular.json`.

## What is missing

- **There is no gateway.** The shell calls `http://localhost:8000` and `csp-api-gateway` holds only its seeded README, while
  `csp-booking-api` publishes no port and has no CORS configuration. The flow was verified against the real API with a
  temporary local proxy, not with the platform.
- **The admin view uses sample data.** Contract 3.1.0 has no route to list the reservations of other users; the view and the
  role check are in place for the day it exists.
- **A client cannot release a hold.** The contract has no such route, so the modal of the navigation map is not built; a hold
  ends by confirmation or expiration.
- **Showtimes come from a constant,** not from Catalog.
- **Ten files are committed with CRLF** (`git ls-files --eol` shows them as `i/-text`: `booking-page.component.ts`,
  `booking-form.component.ts`, `booking-api.service.ts`, `booking.ts`, `money.ts`, `ci.yml`, the files of `deploy/` and the
  pull request template). Editing one rewrites the whole file and counts all of it against the 400 lines of a pull request:
  new files do not have the problem, and a file is normalized in a pull request of its own.

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.
A branch named `qa/...` cannot be created while the branch `qa` exists (Git refuses the reference), so the promotion
branches of this repository are named `qa-promote/<repo>-<description>` (ADR-021).

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `csp-docs`.

## Pull Requests and commits

- Commits follow Conventional Commits: `<type>(<scope>): <description>`, in English, lowercase and imperative.
- A Pull Request has at most **400 changed lines** (additions plus deletions) and one logical goal.
- Every Pull Request targets the permanent branch that matches its prefix, according to the diagram above.
