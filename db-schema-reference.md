# Reservit — DB Schema Reference (Dev Guide)

Use this as a quick-reference while building services/controllers. For full field-level docs, see the schema PDF; this file focuses on **relations, constraints, and what to build around each model**.

---

## Entity relationship map

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

---

## Build order (recommended)

Build features in this order — each layer depends on the one before it existing and having data.

1. ✅ **Movie** — done
2. **Client** (theater owner signup + admin approval)
3. **Theater** (CRUD, scoped to the logged-in Client)
4. **Screen** (CRUD, scoped to a Theater)
5. **Seat** (usually bulk-created when a Screen is created — see note below)
6. **TheaterMovie** (assign movies to a theater)
7. **Showtime** (schedule a movie on a screen)
8. **ShowtimeSeat** (auto-generated when a Showtime is created — see note below)
9. **Booking + BookingSeat** (the actual booking flow, needs Redis locking)
10. **Payment** (if added — see "Not yet in schema" below)

---

## Model-by-model dev notes

### User
- `role` gates access: `SYSTEM_ADMIN`, `CLIENT`, `CUSTOMER`
- Middleware should check `req.user.role` before allowing Client-only or Admin-only routes
- Password: hash with bcrypt/argon2 before saving to `passwordHash`, never store plain text

### Client
- Created when a `CLIENT`-role user completes a "become a theater partner" flow
- `status` starts as `PENDING` — theaters/screens/showtimes for this client should probably be **blocked from going live** until `status = APPROVED`
- Only `SYSTEM_ADMIN` should be able to update `status`, `approvedBy`, `approvedAt`, `rejectionReason`

### Theater
- Every write (create/update/delete) must check `theater.clientId === req.user.client.id` (or admin override) — **never trust a theater ID from the request body alone**
- `isActive` flag: use this to hide a theater from public listings without deleting it

### Screen
- **When creating a Screen, immediately bulk-create its `Seat` rows** based on `totalSeats` (e.g., generate rows A–J with N seats each). Don't make seats manually one at a time.
- Example seat generation logic: decide rows × seats-per-row that sum to `totalSeats`, assign `seatType` per row (e.g., last 2 rows = RECLINER)

### Seat
- Rarely modified after creation — mostly read-only once a screen is set up
- If a theater renovates and changes seat layout, you'd need a migration script, not just an API call — flag this as a manual/admin operation, not a customer-facing endpoint

### TheaterMovie
- Simple join — just an endpoint to add/remove a movie from a theater's current listing
- Good candidate for a `POST /theaters/:id/movies` and `DELETE /theaters/:id/movies/:movieId`

### Showtime
- **When creating a Showtime, immediately bulk-create `ShowtimeSeat` rows** — one per `Seat` on that screen, with `status = AVAILABLE` and `price` derived from `seatType` (e.g., VIP = base price × 1.5)
- Validate `startTime`/`endTime` don't overlap other showtimes on the same screen (the `@@unique([screenId, startTime])` constraint only blocks identical start times, not overlapping ranges — you'll need an explicit overlap check in the service layer)

### ShowtimeSeat — **this is your seat map data**
- `GET /showtimes/:id/seats` should return all `ShowtimeSeat` rows for that showtime — this is what renders the seat picker UI
- `status` transitions: `AVAILABLE → LOCKED → BOOKED`, or `LOCKED → AVAILABLE` (lock expired/released)
- **Never let the client set `status` directly** — it should only change as a side effect of the booking service logic (lock, confirm, expire, cancel)

### Booking + BookingSeat — **the core transaction**
- Creating a `Booking` should be atomic with:
  1. Acquiring a Redis lock per seat (`SET seat:lock:{showtimeSeatId} NX EX 300`)
  2. Creating `Booking` (status `PENDING`) + `BookingSeat` rows
  3. Updating each `ShowtimeSeat.status = LOCKED`
- All three steps should be wrapped in a **Prisma transaction** (`prisma.$transaction([...])`) so a partial failure doesn't leave orphaned locked seats
- Confirming payment → `Booking.status = CONFIRMED`, `ShowtimeSeat.status = BOOKED`, release Redis lock
- Expiry job (cron/BullMQ) → any `Booking` still `PENDING` past its TTL becomes `EXPIRED`, its seats revert to `AVAILABLE`

---

## Not yet in schema (add before production)

| Model/Field | Why |
|---|---|
| `Movie.posterUrl` | You'll need this for the UI almost immediately |
| `Payment` model | Track gateway transaction ID, method, status, refund info — don't rely on `Booking.totalAmount` alone |
| `Booking.ticketCode` / QR reference | Needed for entry validation at the theater |
| `Booking.cancelledAt`, `refundAmount` | If you support cancellations |

---

## API endpoint checklist (suggested REST shape)

```
Auth
  POST   /auth/register
  POST   /auth/login

Movies
  GET    /movies
  GET    /movies/:id
  POST   /movies              (admin)
  PUT    /movies/:id          (admin)
  DELETE /movies/:id          (admin)

Clients
  POST   /clients/apply       (become a theater partner)
  PATCH  /clients/:id/approve (admin only)

Theaters
  GET    /theaters?city=
  POST   /theaters            (client only, own account)
  PUT    /theaters/:id        (client only, own theater)
  DELETE /theaters/:id

Screens & Seats
  POST   /theaters/:id/screens         (also bulk-creates Seats)
  GET    /screens/:id/seats

Showtimes
  GET    /showtimes?movieId=&theaterId=&date=
  POST   /showtimes                    (also bulk-creates ShowtimeSeats)
  GET    /showtimes/:id/seats          (the seat map)

Bookings
  POST   /bookings              (locks seats, creates PENDING booking)
  POST   /bookings/:id/confirm  (payment webhook triggers this)
  POST   /bookings/:id/cancel
  GET    /users/:id/bookings
```

---

## Quick rules to keep in mind while coding

- **Controller** = validate input (Zod) + call service + shape HTTP response. No Prisma calls here.
- **Service** = business logic + Prisma calls. No `req`/`res` here.
- **Never trust IDs from the request body for ownership** — always cross-check against the logged-in user's own Client/Theater.
- **Any multi-step write that touches seats/bookings → wrap in `prisma.$transaction`.**
- **Seat status changes only happen through the booking service** — never exposed as a raw PATCH endpoint.
