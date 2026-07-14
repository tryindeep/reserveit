# Reservit — System Design Document

**Movie Ticket Booking Platform**
Version 1.0 · Based on `db-schema-reference.md` + Prisma schema diagram

---

## 1. Overview

Reservit is a multi-tenant movie ticket booking platform with three actors:

| Role | Capability |
|---|---|
| `SYSTEM_ADMIN` | Approves theater partners, manages the global movie catalog |
| `CLIENT` (theater owner) | Manages own theaters, screens, showtimes |
| `CUSTOMER` | Browses showtimes, books seats, pays |

The system's hardest problem is **not losing double-bookings under concurrency** — two customers must never be able to lock/buy the same seat for the same showtime. Everything in this design is organized around that constraint.

---

## 2. Goals & Non-Goals

**Goals**
- Correct, race-free seat locking and booking
- Multi-tenant isolation (a Client can only ever touch their own Theaters/Screens/Showtimes)
- Horizontally scalable read path (browsing movies/showtimes is the highest-traffic path)
- Clear separation between "provisional hold" (LOCKED) and "confirmed" (BOOKED) seat states

**Non-goals (for v1)**
- Payment gateway integration details (schema has no `Payment` model yet — flagged below)
- Seat-map renovation UI (explicitly a manual/admin migration operation per the schema notes)
- Real-time multi-device seat-map sync (can be added later via WebSockets; v1 uses polling)

---

## 3. High-Level Architecture

```
                         ┌────────────────────┐
                         │   Client Apps       │
                         │ (Web / Mobile)       │
                         └──────────┬───────────┘
                                    │ HTTPS
                         ┌──────────▼───────────┐
                         │   API Gateway / LB    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   Node.js API Layer    │
                         │  Controller → Service   │
                         │  (Express/Nest, Zod)    │
                         └─────┬───────────┬─────┘
                               │           │
                   ┌───────────▼──┐   ┌────▼─────────┐
                   │  PostgreSQL   │   │    Redis      │
                   │  (Prisma ORM) │   │ seat locks +   │
                   │  source of    │   │ cache + queue  │
                   │  truth        │   │ (BullMQ)       │
                   └───────────────┘   └───────┬────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  Booking Expiry Job   │
                                     │  (cron / BullMQ)      │
                                     └───────────────────────┘
```

**Why this shape:**
- **PostgreSQL** is the single source of truth for all relational/booking data — Prisma transactions guarantee atomicity for the booking flow.
- **Redis** does two jobs: (1) a distributed lock per seat during the booking window, (2) a cache for read-heavy, rarely-changing data (movie catalog, showtime listings).
- **BullMQ (Redis-backed)** runs the booking-expiry sweep so `PENDING` bookings that never get paid don't hold seats forever.

---

## 4. Data Model

Derived directly from the Prisma schema diagram. Relationships:

```
User ──1:1── Client ──1:N── Theater ──1:N── Screen ──1:N── Seat
 │                              │               │             │
 │                        N:M (via              │             │
 │                     TheaterMovie)             │             │
 │                              │                │             │
 │                            Movie ──1:N── Showtime            │
 │                                              │                │
 │                                              └──1:N── ShowtimeSeat ──1:1── Seat
 │                                                              │
 └──1:N── Booking ──1:N── BookingSeat ──1:1── ShowtimeSeat
                │
           (belongs to one Showtime)
```

### 4.1 Models (field reference)

| Model | Key fields | Notes |
|---|---|---|
| **User** | `id`, `email`, `passwordHash`, `name`, `phone?`, `role: UserRole`, `createdAt`, `updatedAt` | `role` ∈ `SYSTEM_ADMIN`, `CLIENT`, `CUSTOMER` |
| **Client** | `id`, `userId (FK, 1:1)`, `businessName`, `status: ClientStatus`, `approvedBy?`, `approvedAt?`, `rejectionReason?` | `status` starts `PENDING`; only admin can mutate approval fields |
| **Movie** | `id`, `name`, `description`, `casts: String[]`, `director`, `trailerUrl`, `language`, `releaseDate`, `releaseStatus: ReleaseStatus` | Missing `posterUrl` — see §9 |
| **Theater** | `id`, `name`, `description?`, `city`, `address`, `state?`, `pincode?`, `latitude?`, `longitude?`, `totalScreens`, `amenities: String[]`, `isActive`, `clientId (FK)` | Ownership check: `theater.clientId === req.user.client.id` |
| **TheaterMovie** | `id`, `theaterId (FK)`, `movieId (FK)`, `addedAt` | Simple join table for "now showing" listings |
| **Screen** | `id`, `name`, `totalSeats`, `screenType: ScreenType`, `theaterId (FK)` | Creating a Screen bulk-creates its `Seat` rows |
| **Seat** | `id`, `screenId (FK)`, `row`, `number`, `seatType: SeatType` | Effectively immutable after creation |
| **Showtime** | `id`, `movieId (FK)`, `screenId (FK)`, `startTime`, `endTime`, `price` | Creating a Showtime bulk-creates `ShowtimeSeat` rows |
| **ShowtimeSeat** | `id`, `showtimeId (FK)`, `seatId (FK)`, `price`, `status: ShowtimeSeatStatus` | The live seat map. `status` ∈ `AVAILABLE → LOCKED → BOOKED` (or `LOCKED → AVAILABLE`) |
| **Booking** | `id`, `userId (FK)`, `showtimeId (FK)`, `status: BookingStatus`, `totalAmount` | One booking always belongs to exactly one showtime |
| **BookingSeat** | `id`, `bookingId (FK)`, `showtimeSeatId (FK, 1:1)`, `seatId (FK)` | Join between a confirmed booking and its seats |

### 4.2 Enum reference (inferred from usage)

```
UserRole            = SYSTEM_ADMIN | CLIENT | CUSTOMER
ClientStatus         = PENDING | APPROVED | REJECTED
ReleaseStatus         = COMING_SOON | NOW_SHOWING | ENDED
ScreenType           = STANDARD | IMAX | 4DX | RECLINER_HALL ...
SeatType             = STANDARD | PREMIUM | RECLINER | VIP
ShowtimeSeatStatus     = AVAILABLE | LOCKED | BOOKED
BookingStatus         = PENDING | CONFIRMED | EXPIRED | CANCELLED
```

---

## 5. Build Order (as recommended by schema authors)

Each layer depends on the previous one having data, so build strictly top-down:

1. ✅ Movie (done)
2. Client — signup + admin approval
3. Theater — CRUD scoped to logged-in Client
4. Screen — CRUD scoped to a Theater
5. Seat — bulk-created on Screen creation
6. TheaterMovie — assign movies to a theater
7. Showtime — schedule a movie on a screen
8. ShowtimeSeat — auto-generated on Showtime creation
9. Booking + BookingSeat — the booking flow (needs Redis locking)
10. Payment — not yet in schema, required before production

---

## 6. Service Layer Design

Strict three-layer separation, enforced as a lint/review rule:

```
Controller  → validates input (Zod), calls Service, shapes HTTP response. NO Prisma calls.
Service    → business logic + Prisma calls + Redis calls. NO req/res.
Repository  → (optional 4th layer) thin Prisma wrappers, useful once services get large.
```

### 6.1 Module breakdown

| Module | Responsibilities |
|---|---|
| `auth` | register, login, JWT issuance, password hashing (bcrypt/argon2) |
| `movies` | admin CRUD, public listing/search |
| `clients` | partner application, admin approve/reject |
| `theaters` | CRUD scoped to `req.user.client.id`, public listing by city |
| `screens` | CRUD scoped to theater, **bulk seat generation on create** |
| `theater-movies` | add/remove movie from theater's current listing |
| `showtimes` | CRUD scoped to screen, **bulk ShowtimeSeat generation**, overlap validation |
| `seat-map` | read-only `GET /showtimes/:id/seats` for the seat picker |
| `bookings` | the core transactional flow — lock → create → confirm/expire/cancel |
| `jobs` | BullMQ workers: expire stale PENDING bookings, release orphaned locks |

---

## 7. The Booking Flow (core transaction)

This is the part of the system that needs the most care. Two customers hitting "book" on the same seat within milliseconds of each other must resolve to exactly one winner.

### 7.1 Sequence

```
Customer                API (bookings.service)         Redis                  Postgres
   │  POST /bookings           │                         │                       │
   │  {showtimeId,             │                         │                       │
   │   seatIds:[...]}          │                         │                       │
   │──────────────────────────▶│                         │                       │
   │                           │  SET seat:lock:{id}      │                       │
   │                           │  NX EX 300  (per seat)   │                       │
   │                           │────────────────────────▶│                       │
   │                           │◀── OK / null ────────────│                       │
   │                           │  (any null → abort,       │                       │
   │                           │   release acquired locks)│                       │
   │                           │                         │                       │
   │                           │  prisma.$transaction([   │                       │
   │                           │    create Booking(PENDING),                    │
   │                           │    create BookingSeat[],  │                       │
   │                           │    update ShowtimeSeat    │                       │
   │                           │      status=LOCKED ])     │                       │
   │                           │───────────────────────────────────────────────▶│
   │                           │◀───────────── committed ─────────────────────────│
   │◀── 201 { bookingId,       │                         │                       │
   │      status: PENDING,     │                         │                       │
   │      expiresAt } ─────────│                         │                       │
```

### 7.2 Why Redis lock *and* a DB status field

- The **Redis `SET NX EX`** is the fast, atomic "who got here first" gate — it's what actually prevents the race, because two concurrent requests can't both succeed on the same key.
- The **`ShowtimeSeat.status`** column is the durable, queryable state that the seat-map UI reads (`GET /showtimes/:id/seats`). Redis is ephemeral and shouldn't be treated as a system of record.
- Both must agree: the Prisma transaction should re-check `ShowtimeSeat.status = AVAILABLE` inside the transaction (not just trust the Redis lock) as a defense-in-depth check against clock skew / lock-TTL edge cases.

### 7.3 State transitions

```
                acquire lock + create Booking(PENDING)
AVAILABLE ─────────────────────────────────────────────▶ LOCKED
    ▲                                                        │
    │        lock expires (TTL) / booking cancelled          │
    └────────────────────────────────────────────────────────┘
                                                               │
                                     payment confirmed          │
                                     Booking → CONFIRMED         ▼
                                                              BOOKED
```

| Trigger | Booking.status | ShowtimeSeat.status | Redis lock |
|---|---|---|---|
| `POST /bookings` succeeds | `PENDING` | `AVAILABLE → LOCKED` | acquired, TTL 300s |
| `POST /bookings/:id/confirm` (payment webhook) | `PENDING → CONFIRMED` | `LOCKED → BOOKED` | released |
| Expiry job fires (TTL passed, still `PENDING`) | `PENDING → EXPIRED` | `LOCKED → AVAILABLE` | already expired |
| `POST /bookings/:id/cancel` | `PENDING/CONFIRMED → CANCELLED` | `→ AVAILABLE` | released |

### 7.4 Expiry job

A BullMQ recurring job (e.g. every 30–60s) or a delayed job scheduled at booking-creation time:

```
findMany Booking where status = PENDING AND createdAt < now() - 5min
  → $transaction per booking:
      Booking.status = EXPIRED
      ShowtimeSeat.status = AVAILABLE  (for all its seats)
      release any Redis locks matching seat:lock:{showtimeSeatId} (best-effort; TTL handles it anyway)
```

Using a delayed BullMQ job *keyed to the booking ID* (scheduled at creation, cancelled on confirm) is more efficient than a polling sweep at scale — recommend this over a cron sweep once booking volume grows.

### 7.5 Hard rules (from schema notes, kept as design invariants)

- `ShowtimeSeat.status` is **never** set by a raw client PATCH — only ever mutated as a side effect of the booking service.
- Every multi-step write touching seats/bookings is wrapped in `prisma.$transaction([...])`.
- A partial failure anywhere in the transaction must not leave a seat `LOCKED` with no corresponding `Booking` — this is exactly what `$transaction` prevents.

---

## 8. API Design

```
Auth
  POST   /auth/register
  POST   /auth/login

Movies
  GET    /movies
  GET    /movies/:id
  POST   /movies                     (admin)
  PUT    /movies/:id                 (admin)
  DELETE /movies/:id                 (admin)

Clients
  POST   /clients/apply              (become a theater partner)
  PATCH  /clients/:id/approve         (admin only)

Theaters
  GET    /theaters?city=
  POST   /theaters                    (client only, own account)
  PUT    /theaters/:id                (client only, own theater)
  DELETE /theaters/:id

Screens & Seats
  POST   /theaters/:id/screens         (also bulk-creates Seats)
  GET    /screens/:id/seats

Theater–Movie listing
  POST   /theaters/:id/movies
  DELETE /theaters/:id/movies/:movieId

Showtimes
  GET    /showtimes?movieId=&theaterId=&date=
  POST   /showtimes                   (also bulk-creates ShowtimeSeats)
  GET    /showtimes/:id/seats          (the seat map — powers the seat picker)

Bookings
  POST   /bookings                    (locks seats, creates PENDING booking)
  POST   /bookings/:id/confirm         (payment webhook triggers this)
  POST   /bookings/:id/cancel
  GET    /users/:id/bookings
```

### 8.1 Authorization matrix

| Endpoint group | SYSTEM_ADMIN | CLIENT (own resources) | CUSTOMER |
|---|---|---|---|
| Movies write | ✅ | ❌ | ❌ |
| Client approval | ✅ | ❌ | ❌ |
| Theater/Screen/Showtime write | override | ✅ (own only) | ❌ |
| Booking create/cancel | — | — | ✅ (own only) |
| Booking confirm | webhook/service identity only | — | — |

**Never trust an ID from the request body for ownership.** Every write handler cross-checks the resource's `clientId`/`userId` chain against `req.user`, not against a client-supplied ID.

---

## 9. Gaps to Close Before Production

From the schema reference's own "not yet in schema" list — call these out explicitly in the backlog:

| Item | Why it matters | Suggested fix |
|---|---|---|
| `Movie.posterUrl` | UI needs this almost immediately | Add nullable `String?` column |
| `Payment` model | `Booking.totalAmount` alone can't reconcile gateway transactions, refunds | New model: `gatewayTxnId`, `method`, `status`, `refundId?` |
| `Booking.ticketCode` / QR reference | Needed for entry validation at the theater | Add on `CONFIRMED` transition; generate signed short code |
| `Booking.cancelledAt`, `refundAmount` | Needed if cancellations are supported | Add nullable columns, wire into cancel flow |

---

## 10. Concurrency, Indexing & Constraints

- `Showtime`: `@@unique([screenId, startTime])` exists but **only blocks identical start times** — an explicit overlap check (`startTime < existing.endTime AND endTime > existing.startTime`) must run in the service layer before insert.
- `ShowtimeSeat`: index on `(showtimeId, status)` — this is the hot query for the seat map and for the expiry sweep.
- `Booking`: index on `(userId, status)` for "my bookings" and on `(status, createdAt)` for the expiry job's scan.
- `Seat`: effectively read-only after creation; a layout change is a manual/admin migration script, never a customer-facing endpoint.

---

## 11. Non-Functional Considerations

| Concern | Approach |
|---|---|
| **Consistency** | Postgres is source of truth; Redis lock is a fast-path gate, re-verified inside the DB transaction |
| **Scalability** | Stateless API layer behind a load balancer; Postgres read replicas for catalog/browse traffic; Redis cluster for locks/cache |
| **Caching** | Cache `GET /movies`, `GET /theaters?city=` (rarely change) with short TTL + invalidate on admin write; **never cache `GET /showtimes/:id/seats`** — it must always be live |
| **Idempotency** | `POST /bookings` should accept an idempotency key so retried requests (flaky network) don't double-lock seats |
| **Observability** | Log every `ShowtimeSeat.status` transition with actor + reason; alert on locks that never resolve to BOOKED/AVAILABLE within TTL + grace period |
| **Security** | bcrypt/argon2 password hashing; JWT with role claim; rate-limit `/auth/login` and `/bookings` |

---

## 12. Suggested Repo Layout

```
src/
  modules/
    auth/
    movies/
    clients/
    theaters/
    screens/
    theater-movies/
    showtimes/
    seat-map/
    bookings/
  jobs/
    expire-bookings.job.ts
  lib/
    prisma.ts
    redis.ts
    lock.ts        (SET NX EX wrapper + release helper)
  middleware/
    auth.ts         (req.user.role checks)
    ownership.ts     (clientId/userId cross-checks)
  validation/
    *.schema.ts      (Zod schemas per module)
```
