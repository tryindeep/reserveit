# Reservit — System Design Document

## 1. Overview

Reservit is a multi-tenant movie ticket booking platform (BookMyShow / Fandango / Paytm Movies style). It lets end users browse movies and theaters, book seats with concurrency-safe guarantees, pay online, and leave reviews. Theater owners (clients) manage their own theaters, screens, and showtimes. A system admin oversees the whole platform, including approving new theater-owner accounts.

**Core guarantee this system must provide:** two users can never successfully book the same seat for the same showtime, even under simultaneous requests.

---

## 2. Actors & Roles

| Actor | Registration | Scope |
|---|---|---|
| **System Admin** | Seeded directly in DB — no public registration endpoint, ever | Full CRUD on all resources; approves/rejects Client accounts; can deactivate any theater, movie, or user |
| **Client** (theater owner) | Self-registers via API, but account starts `PENDING` and cannot log in / act until an admin approves it | CRUD only on Theaters/Screens/Showtimes they own; can view bookings and reviews for their own theaters; can push notifications about their releases/discounts |
| **Registered User** (customer) | Self-registers freely, immediately active | Browse, book, cancel, pay, view own booking history, leave reviews/ratings |
| **Unregistered / Guest** | No account | Browse movies and theaters only — read-only, no booking, no reviews |

This is a **three-tier authorization model**, not just two roles — the key nuance is that `Client` is a role that exists in a pending or approved *state*, which is different from `Customer`, which has no such gate. That state machine needs to be modeled explicitly (see §4).

### Permission matrix (high level)

| Action | Guest | Customer | Client | Admin |
|---|---|---|---|---|
| Browse movies/theaters | ✅ | ✅ | ✅ | ✅ |
| Register | — | ✅ (instant) | ✅ (pending approval) | seeded only |
| Book / cancel / pay | ❌ | ✅ | ❌ (not their job) | ✅ (support cases) |
| Leave review/rating | ❌ | ✅ | ❌ | ❌ |
| CRUD own Theater/Screen/Showtime | ❌ | ❌ | ✅ (own only) | ✅ (any) |
| CRUD Movies (global catalog) | ❌ | ❌ | ❌ | ✅ |
| Approve/reject Client accounts | ❌ | ❌ | ❌ | ✅ |
| Push notifications (release/discount) | ❌ | ❌ | ✅ (own theater's audience) | ✅ |
| View platform-wide reports | ❌ | ❌ | ❌ (own theater only) | ✅ |

Open question worth deciding before you build it: **who owns the Movie catalog?** In real BookMyShow-style platforms, the movie itself (title, cast, trailer) is usually a global entity curated by admins, while *which theater is screening it, at what price, on what screen* is what the Client controls via Showtime. I'd recommend keeping Movie CRUD admin-only, and letting Clients only create Showtimes that reference existing movies — otherwise you get duplicate/inconsistent movie entries across theaters. Flag if you intended it differently.

---

## 3. High-Level Architecture

```
                          ┌─────────────────┐
                          │   React SPA     │
                          │ (Zustand + RQ)  │
                          └────────┬────────┘
                                   │ HTTPS
                          ┌────────▼────────┐
                          │   Express API   │
                          │  (TypeScript)   │
                          └───┬────────┬────┘
                 ┌────────────┘        └────────────┐
        ┌────────▼────────┐                ┌────────▼────────┐
        │   PostgreSQL     │                │      Redis       │
        │  (Neon-hosted)   │                │  seat locks +    │
        │  source of truth │                │  rate limiting   │
        └──────────────────┘                └──────────────────┘
                 │
        ┌────────▼────────┐
        │  Background job  │  → expires stale PENDING bookings,
        │  (cron / worker) │    releases Redis locks
        └──────────────────┘

        ┌──────────────────┐
        │ Notification      │  → email/push for new releases,
        │ dispatch (async)  │    discounts, booking confirmations
        └──────────────────┘
```

**Why Postgres is the source of truth and Redis is not:** Redis locks give fast UX feedback ("this seat just got taken"), but the actual correctness guarantee against double-booking has to live in Postgres as a unique constraint — Redis can fail, expire early, or be bypassed by a retry; a DB constraint cannot. This is the same principle already anchoring your `BookingSeat.@@unique([showtimeId, seatId])` design.

---

## 4. Data Model

### New entities this brief introduces (beyond what's already built)

```prisma
enum UserRole {
  SYSTEM_ADMIN
  CLIENT
  CUSTOMER
}

enum ClientStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String
  phone        String?
  role         UserRole     @default(CUSTOMER)

  // Only populated when role = CLIENT
  clientProfile Client?

  bookings     Booking[]
  reviews      Review[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Client {
  id          String       @id @default(cuid())
  userId      String       @unique
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName String
  status      ClientStatus @default(PENDING)
  approvedBy  String?      // admin's User.id, set on approval
  approvedAt  DateTime?
  rejectionReason String?
  theaters    Theater[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Review {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movieId    String?
  movie      Movie?   @relation(fields: [movieId], references: [id], onDelete: Cascade)
  theaterId  String?
  theater    Theater? @relation(fields: [theaterId], references: [id], onDelete: Cascade)
  rating     Int      // 1-5
  comment    String?
  createdAt  DateTime @default(now())

  @@index([movieId])
  @@index([theaterId])
}

enum NotificationType {
  NEW_RELEASE
  DISCOUNT
  BOOKING_CONFIRMATION
  BOOKING_CANCELLED
  PAYMENT_RECEIPT
}

model Notification {
  id         String           @id @default(cuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       NotificationType
  title      String
  body       String
  read       Boolean          @default(false)
  createdAt  DateTime         @default(now())
}
```

### Changes required to existing models

- **`Theater`** needs `clientId String` + `client Client @relation(...)` — this is the multi-tenancy anchor. Every Theater must belong to exactly one Client. Add `@@index([clientId])`.
- **`Movie`** gains `reviews Review[]` reverse relation; consider adding `posterUrl`, `durationMins`, `genre String[]`, `censorRating` (already flagged in your roadmap — still relevant here).
- **`Payment`** (new, sits alongside Booking):

```prisma
enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

model Payment {
  id            String        @id @default(cuid())
  bookingId     String        @unique
  booking       Booking       @relation(fields: [bookingId], references: [id])
  amount        Float
  status        PaymentStatus @default(PENDING)
  provider      String        // "mock", "razorpay", etc.
  providerRefId String?       // external transaction id
  idempotencyKey String       @unique
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

The `idempotencyKey` unique constraint is what actually prevents a double-charge on client retry — same principle as the seat-booking unique constraint, applied to payments.

### Full entity relationship summary

```
User (1) ── (0..1) Client (1) ── (many) Theater (1) ── (many) Screen (1) ── (many) Showtime
                                                                  │                    │
                                                                  └─(many) Seat         │
                                                                                        │
Movie (1) ──────────────────────────────────────────────────────────────(many) Showtime
  │                                                                                     │
  └─(many) Review                                                              (many) Booking (1) ── (many) BookingSeat
User (1) ──(many) Booking                                                                    │
                                                                                       (1) Payment
```

---

## 5. Authentication & Authorization Flow

**Auth:** JWT-based, standard access-token flow (reuse your CEX v2/Clovis patterns).

```
POST /api/v1/auth/register           → creates User, role=CUSTOMER by default
POST /api/v1/auth/register/client    → creates User (role=CLIENT) + Client (status=PENDING)
POST /api/v1/auth/login              → returns JWT { userId, role }
```

**Middleware chain per protected route:**
1. `authenticate` — verifies JWT, attaches `req.user`
2. `authorize(...allowedRoles)` — checks `req.user.role` against an allow-list
3. For Client routes specifically: `requireApprovedClient` — checks `Client.status === APPROVED`, blocking a pending or rejected client from doing anything beyond viewing their own application status

**Client approval workflow (new, explicit state machine):**
```
Client registers → status=PENDING (can log in, but every Client-scoped route
                    returns 403 "account pending approval" except
                    GET /api/v1/clients/me/status)
Admin reviews    → PUT /api/v1/admin/clients/:id/approve   → status=APPROVED
                 → PUT /api/v1/admin/clients/:id/reject     → status=REJECTED, requires rejectionReason
```

Worth deciding: does a rejected Client get a path to reapply, or is it terminal? I'd suggest allowing resubmission (reset to `PENDING` with a note), otherwise a typo in the business registration form permanently locks someone out.

**Ownership check (not just role check):** For Client-scoped resources, role alone isn't enough — you also need "does this Theater belong to *this* Client." This should live in the service layer, e.g.:

```typescript
const theater = await db.theater.findUnique({ where: { id: theaterId } });
if (!theater || theater.clientId !== req.user.clientProfile.id) {
  return { error: "FORBIDDEN" as const };
}
```

This is a new pattern relative to what you've built so far (Movie/Theater CRUD had no ownership concept) — it's effectively row-level authorization on top of role-based authorization.

---

## 6. Booking & Concurrency Flow (unchanged from earlier design, now with payment tied in)

```
1. GET  /showtimes/:id/seats
     → returns seat map: available / locked-by-others / booked

2. POST /bookings/hold          { showtimeId, seatIds[] }
     → for each seatId: Redis SET seat:{showtimeId}:{seatId} userId EX 300 NX
     → if any seat lock fails (already held) → roll back acquired locks, return 409 with which seats failed
     → create Booking (status=PENDING, expiresAt=now+5min)

3. POST /bookings/:id/confirm   { idempotencyKey }
     → verify Redis locks still owned by this user
     → in a DB transaction:
         - insert BookingSeat rows (protected by @@unique([showtimeId, seatId]))
         - create Payment (status=PENDING) keyed by idempotencyKey
         - call payment provider (mocked)
         - on success: Booking.status=CONFIRMED, Payment.status=SUCCESS
         - on failure: Booking.status=CANCELLED, Payment.status=FAILED, release locks
     → send BOOKING_CONFIRMATION notification (async, don't block the response on it)

4. POST /bookings/:id/cancel
     → only allowed if status=CONFIRMED and showtime.startTime is sufficiently in the future
       (decide a cancellation cutoff, e.g. 2 hours before showtime — flag this as a business rule to confirm)
     → sets status=CANCELLED, triggers Payment refund flow (mocked), releases seats

5. GET  /bookings?filter=upcoming|past
     → upcoming: status=CONFIRMED AND showtime.startTime > now
     → past: status=CONFIRMED AND showtime.startTime <= now, OR status=CANCELLED
```

**Background job** (cron, e.g. every minute): find `Booking.status=PENDING AND expiresAt < now`, mark `EXPIRED`, release any Redis locks still outstanding — this handles the case where a user abandons checkout mid-flow.

---

## 7. Notifications (new release / discounts / feedback loop)

Given the brief mentions "cinema owner can inform the user about new release and discounts and get feedback and reviews," this needs two directions of flow:

- **Client → Customer:** Client creates a `Notification` (or a `Promotion`/`Announcement` if you want it separate from transactional notices) targeting either all users, or users who've previously booked at their theater. Simplest v1: a table + a `GET /notifications` endpoint for the logged-in user, no real push infra needed yet. Real push (email/SMS/web push) is an infra upgrade, not required for a working v1 — I'd explicitly scope that out for now given your timeline, same way you scoped out real payment gateways.
- **Customer → Client (feedback):** this is just the `Review` model — ratings/comments tied to a Movie or a Theater, readable by the Client for their own theaters and by anyone browsing.

---

## 8. API Surface Summary (new/changed routes only — CRUD for Movie/Theater/Screen/Showtime stay as already designed)

```
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/register/client
POST   /api/v1/auth/login

# Admin — client approval
GET    /api/v1/admin/clients?status=PENDING
PUT    /api/v1/admin/clients/:id/approve
PUT    /api/v1/admin/clients/:id/reject

# Client self-service
GET    /api/v1/clients/me/status

# Reviews
POST   /api/v1/reviews                 (customer only)
GET    /api/v1/movies/:id/reviews
GET    /api/v1/theaters/:id/reviews

# Notifications
POST   /api/v1/notifications           (client/admin only, targets audience)
GET    /api/v1/notifications           (current user's inbox)
PATCH  /api/v1/notifications/:id/read

# Bookings (as designed earlier)
POST   /api/v1/bookings/hold
POST   /api/v1/bookings/:id/confirm
POST   /api/v1/bookings/:id/cancel
GET    /api/v1/bookings?filter=upcoming|past

# Payments
GET    /api/v1/payments/:bookingId
```

---

## 9. Non-Functional Considerations

- **Rate limiting:** especially on `/bookings/hold` and `/auth/login` — Redis-backed, reuse your Clovis pattern.
- **Pagination:** required on any list endpoint that isn't scoped to a single user's data — `getAllMovies`, `getAllTheaters`, admin's `getAllClients`.
- **Indexes:** `Theater.clientId`, `Review.movieId`/`theaterId`, `Booking.userId`, `Booking.showtimeId` — anywhere you'll filter/join at scale.
- **Idempotency:** payment confirmation, already covered above.
- **Audit trail (optional, nice-to-have for interviews):** an `AuditLog` model recording admin actions (approve/reject client, delete movie) — shows you thought about accountability in a multi-tenant system. Not required for v1, worth mentioning as a "if I had more time" item.

---

## 10. Revised Build Roadmap (folding this design into your existing sequence)

1. ~~Movie / Theater / TheaterMovie CRUD~~ ✅ done
2. **Screen CRUD** ← in progress
3. Showtime CRUD + overlap check
4. Seat model + CRUD
5. **Auth + Role model (User.role, Client, approval workflow)** — moved earlier in sequence from your original plan, because Theater now needs `clientId`, which means ownership needs to exist before you wire up Client-scoped CRUD permission checks. Practically: build the `User`/`Client` schema and JWT auth now, but you can defer the *full* approval UI/admin panel until later.
6. Booking + BookingSeat + Redis locking (concurrency core, unchanged)
7. Payment model + mock payment flow + idempotency
8. Review model + endpoints
9. Notification model + endpoints
10. Polish: pagination, rate limiting, audit log (optional)

The one real structural change from your original plan: **Auth/roles needs to move up**, because without `Client.status` and `Theater.clientId`, you can't correctly gate "who can create a Screen under this Theater" — which is the very next thing you're building. Worth deciding now whether to retrofit `clientId` onto Theater before or after finishing Screen CRUD; either works, but doing it before means Screen's ownership check is correct from day one instead of needing a later patch.
