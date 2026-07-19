# Reservit — System Design Document

**A movie & event ticketing backend with concurrency-safe seat reservations**

---

## 1. Overview

Reservit is a multi-tenant movie ticket booking platform. Theater owners ("Clients") list their theaters, screens, and showtimes; customers browse movies and book seats. The system's core engineering challenge is **preventing two customers from booking the same seat at the same time**, while keeping the booking flow fast and simple to reason about.

### 1.1 Actors

| Actor | Role in system | Key capabilities |
|---|---|---|
| **System Admin** | Platform operator | Approves/rejects client accounts, manages movie catalog |
| **Client** | Theater owner/business | Manages own theaters, screens, showtimes (once approved) |
| **Customer** | End user | Browses movies/showtimes, books and pays for seats |

### 1.2 Core user journeys

1. **Client onboarding**: Register → wait for admin approval → create theaters/screens/showtimes
2. **Customer booking**: Browse movies → pick showtime → select seats → hold → pay → confirm
3. **Admin curation**: Approve clients, manage the movie catalog, assign movies to theaters

---

## 2. High-level architecture

```
                              ┌─────────────────┐
                              │   Client Apps    │
                              │ (Web / Mobile)   │
                              └────────┬─────────┘
                                       │ HTTPS / REST
                                       ▼
                         ┌─────────────────────────┐
                         │   Express API Server     │
                         │   (Node.js / Bun)         │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │     Middleware      │  │
                         │  │  authenticate       │  │
                         │  │  authorize (RBAC)   │  │
                         │  │  requireApproved    │  │
                         │  │  Client             │  │
                         │  └─────────┬──────────┘  │
                         │            ▼              │
                         │  ┌────────────────────┐  │
                         │  │    Controllers      │  │
                         │  │  (validation + I/O) │  │
                         │  └─────────┬──────────┘  │
                         │            ▼              │
                         │  ┌────────────────────┐  │
                         │  │     Services         │  │
                         │  │  (business logic)    │  │
                         │  └─────────┬──────────┘  │
                         └────────────┼──────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │   Prisma ORM             │
                         └────────────┬─────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │   PostgreSQL (Neon)      │
                         └─────────────────────────┘

                         ┌─────────────────────────┐
                         │  Background Sweep Job     │
                         │  (setInterval, 60s)       │
                         │  expireStaleBookings()    │
                         └─────────────────────────┘
```

### 2.1 Layered architecture within the API

```
Request → Routes → Middleware → Controller → Service → Prisma → PostgreSQL
                                                 │
                                            Response ◄──┘
```

- **Routes** — URL-to-handler wiring only, plus declaring which middleware guards each endpoint
- **Middleware** — cross-cutting concerns: authentication, role authorization, client-approval gating
- **Controllers** — HTTP boundary: parse/validate input (Zod), call service, shape the response. No Prisma calls.
- **Services** — business logic and all Prisma calls. No `req`/`res`. Fully unit-testable in isolation.

This separation means the same service function could be called from an HTTP controller, a background job, or a CLI script without modification — which is exactly how `expireStaleBookings()` is used (from a `setInterval`, not an HTTP request).

---

## 3. Data model

### 3.1 Entity relationship overview

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

### 3.2 Why `ShowtimeSeat` exists as its own model

A naive design might try to track seat availability directly on `Seat`. This breaks immediately: the same physical seat (e.g. row A, seat 1) is available for Tuesday's 3pm showing but booked for Tuesday's 7pm showing. **Availability is a property of (seat, showtime), not of the seat alone.**

`ShowtimeSeat` solves this by materializing one row per seat per showtime, each with its own `status` (`AVAILABLE` / `LOCKED` / `BOOKED`) and `price` (allowing per-tier pricing — VIP seats cost more than Standard on the same showtime). This is the single source of truth the booking flow reads and writes against.

### 3.3 State machines

**ShowtimeSeat status:**
```
AVAILABLE → LOCKED  (customer holds seat)
LOCKED → BOOKED     (payment confirmed)
LOCKED → AVAILABLE  (hold cancelled or expired)
```

**Booking status:**
```
PENDING → CONFIRMED   (payment succeeds)
PENDING → EXPIRED     (hold times out, 5 min)
PENDING → CANCELLED   (user cancels before paying)
CONFIRMED → CANCELLED (user cancels after paying)
```

### 3.4 Client approval state machine

```
PENDING → APPROVED   (admin approves; enables theater/screen/showtime creation)
PENDING → REJECTED   (admin rejects, with a required reason)
```
`PENDING` and `REJECTED` clients are blocked from all theater-management endpoints by the `requireApprovedClient` middleware.

---

## 4. The seat-booking flow (core design)

This is the part of the system where correctness under concurrency matters most. Two customers must never be able to book the same seat for the same showtime, even if they click "book" within milliseconds of each other.

### 4.1 Sequence: successful booking

```
Customer                API                      Database
   │                     │                            │
   │  POST /bookings/hold │                            │
   ├────────────────────►│                            │
   │                     │  Validate showtime exists   │
   │                     ├───────────────────────────►│
   │                     │  Validate all seatIds        │
   │                     │  belong to this showtime     │
   │                     ├───────────────────────────►│
   │                     │  Check none are already      │
   │                     │  taken (status !== AVAILABLE)│
   │                     ├───────────────────────────►│
   │                     │                            │
   │                     │  BEGIN TRANSACTION          │
   │                     │   1. create Booking(PENDING)│
   │                     │   2. updateMany ShowtimeSeat │
   │                     │      WHERE status=AVAILABLE  │
   │                     │      SET status=LOCKED       │
   │                     │      (per seat)               │
   │                     │   3. IF any updateMany.count  │
   │                     │      === 0 → ROLLBACK        │
   │                     │   4. createMany BookingSeat   │
   │                     │  COMMIT                      │
   │                     ├───────────────────────────►│
   │  201 { booking }     │                            │
   │◄────────────────────┤                            │
   │                     │                            │
   │  POST /bookings/:id/confirm (after payment)        │
   ├────────────────────►│                            │
   │                     │  BEGIN TRANSACTION           │
   │                     │   Booking → CONFIRMED         │
   │                     │   ShowtimeSeat → BOOKED        │
   │                     │  COMMIT                       │
   │                     ├───────────────────────────►│
   │  200 { booking }     │                            │
   │◄────────────────────┤                            │
```

### 4.2 The concurrency mechanism — optimistic locking

Rather than a distributed lock (Redis `SETNX`), Reservit uses **optimistic concurrency control at the database level**, leaning on PostgreSQL's own transaction guarantees:

```typescript
const updateResult = await tx.showtimeSeat.updateMany({
    where: { id: seat.id, status: "AVAILABLE" },  // condition checked atomically
    data: { status: "LOCKED" },
});
if (updateResult.count === 0) {
    throw { code: "RACE_LOST" };  // someone else grabbed it first
}
```

**Why this works:** `updateMany` with a `WHERE status = 'AVAILABLE'` clause is evaluated and applied atomically by Postgres. If two requests race to lock the same seat, only one `UPDATE` can match the `WHERE` condition first — the second request's `updateMany` returns `count: 0` because by the time it runs, `status` is no longer `AVAILABLE`. That failure throws, the whole transaction rolls back (including the `Booking` row created earlier in the same transaction), and the customer receives a clean `SEAT_ALREADY_TAKEN` error.

This is simpler to operate than a Redis-based lock (no separate lock-expiry service, no split-brain risk between Redis and Postgres state) at the cost of being scoped to a single database — acceptable for the current scale, and revisited in §7.

### 4.3 Hold expiry — preventing abandoned locks

A customer who holds seats and never pays would otherwise lock those seats forever. Two mechanisms guard against this:

1. **`expiresAt` on `Booking`** — set to `now + 5 minutes` at hold time.
2. **Background sweep**, running every 60 seconds via `setInterval` in `index.ts`:
   ```typescript
   setInterval(async () => {
       const count = await BookingService.expireStaleBookings();
   }, 60_000);
   ```
   This finds all `PENDING` bookings past their `expiresAt`, releases their seats back to `AVAILABLE`, and marks the booking `EXPIRED`.

Additionally, `confirmBooking` itself double-checks expiry at confirmation time (not just relying on the sweep), so a booking can't be confirmed in the gap between expiry and the next sweep cycle.

---

## 5. Authentication & authorization

### 5.1 Authentication

JWT-based, stateless. `POST /auth/login` issues a token containing `{ userId, role }`, signed with `JWT_SECRET`, valid for 7 days. Every protected route runs the `authenticate` middleware, which verifies the token and attaches `req.user`.

### 5.2 Authorization — two independent layers

| Middleware | Checks | Used for |
|---|---|---|
| `authorize(...roles)` | Is `req.user.role` in the allowed list? | Admin-only routes (movie CRUD, client approval), Client-only routes (theater/screen/showtime CRUD) |
| `requireApprovedClient` | Does this user's `Client.status === "APPROVED"`? | All theater-management write routes |

These are deliberately separate: role determines *what kind* of actions you might be allowed to do; approval status determines whether a `CLIENT`-role user's business account has been vetted yet. A brand-new client has the right *role* but the wrong *status* — both gates must pass.

### 5.3 Resource ownership checks

Beyond role/approval, every mutating service function re-validates ownership before acting — e.g. `ScreenService.updateScreen` checks `existing.theater.clientId === clientId` before allowing the update. **IDs from the request are never trusted implicitly** — a client cannot edit a screen belonging to another client's theater merely by guessing/passing its ID.

---

## 6. API surface

```
/api/v1/auth            register, register/client, login
/api/v1/movies           CRUD (admin-gated writes), search, public reads
/api/v1/theaters         CRUD (client-gated writes, ownership-checked), search, public reads
/api/v1/theaters/:id/movies    theater-movie assignment (admin-gated)
/api/v1/theaters/:id/screens   screen CRUD (client-gated, ownership-checked)
/api/v1/screens/:id/seats      seat generation + listing
/api/v1/showtimes              CRUD (client-gated, ownership-checked), seat map
/api/v1/bookings                hold, confirm, cancel, get (customer, ownership-checked)
/api/v1/clients                 pending list, approve/reject (admin-gated)
```

Response shape is consistent across all endpoints:
```json
{ "success": true, "data": { ... }, "message": "..." }
{ "success": false, "message": "...", "error": [...] }
```

Error codes are centralized in a single `ERROR_MAP` (`utils/errorMap.ts`), mapping domain error strings (e.g. `SEAT_ALREADY_TAKEN`, `FORBIDDEN`, `OVERLAP`) to HTTP status + message pairs — services return typed error unions (`{ error: "X" as const }`), controllers stay free of status-code logic.

---

## 7. Design decisions & tradeoffs

| Decision | Rationale | Tradeoff accepted |
|---|---|---|
| Optimistic DB locking over Redis distributed locks | Fewer moving parts; Postgres transactions already give atomicity | Doesn't scale past a single Postgres primary; would need Redis if sharding the DB later |
| 5-minute hold window, swept every 60s | Balances "seats don't disappear too long" vs. sweep overhead | Up to 60s of drift between expiry and cleanup — acceptable since `confirmBooking` double-checks expiry anyway |
| Per-model service functions with typed error unions | Predictable, centrally-mapped errors; no scattered `res.status()` in business logic | More boilerplate per service function than throwing exceptions |
| `ShowtimeSeat` materialized per showtime rather than computed on the fly | O(1) seat-map reads, simple locking target | Extra write at showtime-creation time (bulk insert one row per seat); extra storage |
| JWT stateless auth | No session store needed, horizontally scalable API | No server-side revocation — a leaked token is valid until expiry (7 days) |
| Two-tier authorization (role + approval status) | Keeps "who are you" and "are you vetted" as separate, composable checks | Two middleware calls per protected client route instead of one |

---

## 8. Known gaps / not yet built

- **Payment integration** — `Booking.totalAmount` exists, but no actual payment gateway (Stripe/Razorpay) or webhook handler yet. `confirmBooking` currently assumes payment succeeded by the time it's called.
- **Movie poster images** — `Movie.trailerUrl` exists; no `posterUrl` field yet.
- **Ticket/QR entry validation** — no mechanism to mark a confirmed booking as "used" at the theater door.
- **Refund tracking** — `BookingStatus.CANCELLED` exists, but no `refundAmount`/`refundStatus` fields.
- **Soft deletes** — all deletes are hard deletes with cascade; theater/showtime history disappears if a venue is removed.
- **Rate limiting** — no protection yet against booking-endpoint abuse (e.g. bots holding seats to grief other customers).

---

## 9. Scaling considerations (future)

If load grows beyond a single Postgres instance can comfortably serve:

- **Read replicas** for movie/theater/showtime browsing (read-heavy, tolerant of slight staleness) — keep booking writes on the primary.
- **Redis-backed seat locks** would become necessary if moving to multiple Postgres shards, since the current optimistic-locking approach relies on a single database's transactional guarantees.
- **Queue-based booking confirmation** (e.g. BullMQ) if payment webhook volume grows, decoupling webhook receipt from booking-state mutation.
- **CDN caching** for movie/theater listing endpoints, which change infrequently relative to read volume.
