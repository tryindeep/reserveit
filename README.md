# ReserveIt

ReserveIt is a full-stack movie ticketing platform built around the difficult part of reservations: making sure that a seat cannot be sold twice. It provides separate customer, theatre-client, and system-administrator experiences, together with a concurrency-safe booking and payment flow.

## Highlights

- Browse films, theatre listings, showtimes, and live seat availability.
- JWT-based authentication with `CUSTOMER`, `CLIENT`, and `SYSTEM_ADMIN` roles.
- Theatre-client approval workflow and theatre, screen, movie, and showtime management.
- Five-minute Redis seat holds backed by transactional PostgreSQL updates.
- Per-showtime, per-seat pricing and availability.
- Razorpay order creation, signature verification, and webhook confirmation.
- Automatic expiry sweep for abandoned bookings.

## Technology

| Area         | Tools                                                    |
| ------------ | -------------------------------------------------------- |
| Monorepo     | Bun workspaces and Turborepo                             |
| Frontend     | React 19, TypeScript, Vite, React Router, Zustand, Axios |
| API          | Express 5, TypeScript, JWT, Zod                          |
| Data         | PostgreSQL, Prisma 7, `pg` adapter                       |
| Coordination | Redis via ioredis                                        |
| Payments     | Razorpay                                                 |

## Repository layout

```text
apps/
  backend/                 Express API and business logic
  frontend/                React/Vite web application
packages/
  db/                      Prisma schema, migrations, generated client, seed script
  ui/                      Shared UI primitives
  eslint-config/           Shared lint configuration
  typescript-config/       Shared TypeScript configuration
tools/                     Repository tooling
reservit-api-routes.md     Detailed API route reference
reservit-system-design.md  System-design notes
```

## Prerequisites

- [Bun](https://bun.sh/) 1.3.14 or newer
- Node.js 18 or newer (required by the workspace metadata; Bun runs the project)
- PostgreSQL database
- Redis instance
- A Razorpay test or live account when testing payments

## Quick start

1. Install dependencies from the repository root:

   ```bash
   bun install
   ```

2. Create `apps/backend/.env`:

   ```dotenv
   PORT=3000
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/reserveit?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="replace-with-a-long-random-secret"
   RAZORPAY_KEY_ID="rzp_test_..."
   RAZORPAY_KEY_SECRET="..."
   RAZORPAY_WEBHOOK_SECRET="..."
   ```

   The backend loads this file through `dotenv/config`. The database package uses the same `DATABASE_URL`, so run Prisma commands from a shell where that variable is available as well (or place an equivalent `.env` where your Prisma workflow loads it).

3. Create `apps/frontend/.env`:

   ```dotenv
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```

4. Apply the existing database migrations:

   ```bash
   bunx prisma migrate deploy --schema packages/db/prisma/schema.prisma
   ```

   For local schema changes, use `bunx prisma migrate dev --schema packages/db/prisma/schema.prisma` instead. You can load sample data with:

   ```bash
   bun run --cwd packages/db prisma/seed.ts
   ```

5. Start development services:

   ```bash
   bun run dev
   ```

   Or run them separately in two terminals:

   ```bash
   bun run --cwd apps/backend dev
   bun run --cwd apps/frontend dev
   ```

   The browser app normally runs on `http://localhost:5173`; the API defaults to port `3000`. The current CORS policy permits `http://localhost:5173`.

## Scripts

Run these from the repository root:

| Command               | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `bun run dev`         | Run all workspace development tasks through Turborepo    |
| `bun run build`       | Build all workspaces that expose a build task            |
| `bun run lint`        | Run workspace lint tasks                                 |
| `bun run check-types` | Run workspace type-check tasks                           |
| `bun run format`      | Format TypeScript, TSX, and Markdown files with Prettier |

## Reservation lifecycle

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> LOCKED: Customer holds seats
    LOCKED --> BOOKED: Payment confirmed
    LOCKED --> AVAILABLE: Cancelled or hold expires
    BOOKED --> AVAILABLE: Booking cancelled
```

When a customer selects seats, the API first obtains one Redis key per seat using an atomic `SET ... NX EX` operation. It then creates a `PENDING` booking and changes the corresponding `ShowtimeSeat` rows from `AVAILABLE` to `LOCKED` inside a database transaction. Conditional updates and the unique booking-seat relation provide a second, durable concurrency boundary if requests race.

Holds last five minutes. A background task runs every minute to expire pending bookings, return their seats to `AVAILABLE`, and remove the related Redis locks. A successful payment changes the booking to `CONFIRMED` and the seats to `BOOKED`.

## Payments

1. A customer holds seats and receives a pending booking.
2. The frontend requests an order from `POST /api/v1/payments/bookings/:id/create-order`.
3. Razorpay Checkout completes payment.
4. The API validates the client-side payment signature and also accepts Razorpay webhooks at `/api/v1/webhooks/razorpay`.
5. A validated payment marks the payment `PAID`, confirms the booking, and books the selected seats.

The confirmation path is designed to be idempotent: a browser callback and webhook that arrive together can both safely process a booking already marked confirmed.

## API overview

All application endpoints are mounted beneath `/api/v1`.

| Resource                  | Base route       | Responsibility                              |
| ------------------------- | ---------------- | ------------------------------------------- |
| Authentication            | `/auth`          | Register, login, and user identity          |
| Movies                    | `/movies`        | Film catalogue management and discovery     |
| Theatres                  | `/theaters`      | Theatre records and theatre-film assignment |
| Screens, showtimes, seats | mixed `/` routes | Inventory, schedules, and seat maps         |
| Bookings                  | `/bookings`      | Hold, view, confirm, or cancel reservations |
| Clients                   | `/clients`       | Client profile and approval operations      |
| Payments                  | `/payments`      | Razorpay orders and payment confirmation    |
| Webhooks                  | `/webhooks`      | Razorpay webhook receiver                   |

For endpoint payloads, authentication requirements, and examples, see [reservit-api-routes.md](./reservit-api-routes.md). Design decisions and the data model are described in [reservit-system-design.md](./reservit-system-design.md).

## Data model

The core relationship is:

```text
Client -> Theatre -> Screen -> Seat
                  -> Showtime -> ShowtimeSeat <- BookingSeat <- Booking <- User
                               -> Movie
```

Physical seats belong to a screen and are reused across all its showtimes. `ShowtimeSeat` stores the availability and price of that physical seat for one specific showing. This keeps inventory scoped correctly: booking seat A1 for one showing does not affect A1 for another.

The complete Prisma schema is at [packages/db/prisma/schema.prisma](./packages/db/prisma/schema.prisma), and committed migrations are under `packages/db/prisma/migrations`.

## Roles

| Role                 | Main capabilities                                                        |
| -------------------- | ------------------------------------------------------------------------ |
| Customer             | Browse, select seats, make payments, and manage personal bookings        |
| Client               | Manage an approved theatre business, screens, programming, and showtimes |
| System administrator | Review clients and administer platform-level resources                   |

## Development notes

- Keep secrets in local `.env` files; do not commit them.
- Webhook verification requires the exact raw request body, which is why the webhook router is registered before the JSON body parser.
- For a Razorpay webhook running locally, expose the backend with a secure tunnelling service and configure its webhook URL and secret in Razorpay.
- The API uses cookie-capable CORS (`credentials: true`); change the allowed origin in `apps/backend/index.ts` before deploying the frontend elsewhere.

## Further documentation

- [API route reference](./reservit-api-routes.md)
- [System design](./reservit-system-design.md)
- [Complete project and interview guide](./Reserveit_Complete_Project_and_Interview_Guide.docx)

## License

No license is currently declared. Add one before distributing or accepting external contributions.
