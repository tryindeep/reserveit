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
   FRONTEND_URL=http://localhost:5173
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

## Deployment

The recommended production setup is Vercel for the frontend, Render for the API, a managed PostgreSQL database, and managed Redis.

### 1. Provision managed services

Create a production PostgreSQL database (for example, Neon or Render Postgres) and a Redis database (for example, Upstash or Redis Cloud). Keep their connection URLs ready; they become `DATABASE_URL` and `REDIS_URL` in the API service.

### 2. Deploy the API to Render

1. In Render, create **New > Web Service** and connect this repository.
2. Use the repository root as the service root directory.
3. Set the build command:

   ```bash
   bun install --frozen-lockfile && bun run --cwd packages/db generate && bun run --cwd packages/db migrate:deploy
   ```

4. Set the start command:

   ```bash
   bun run --cwd apps/backend start
   ```

5. Add these environment variables in Render. Do not add a production `PORT`; Render supplies it automatically.

   ```dotenv
   DATABASE_URL=your-production-postgres-url
   REDIS_URL=your-production-redis-url
   JWT_SECRET=a-long-random-production-secret
   RAZORPAY_KEY_ID=rzp_live_or_test_key
   RAZORPAY_KEY_SECRET=razorpay-key-secret
   RAZORPAY_WEBHOOK_SECRET=dedicated-webhook-secret
   NODE_ENV=production
   ```

6. Deploy. Once successful, Render displays a URL such as `https://reserveit-api.onrender.com` on the service's overview page. Copy it and verify the API with:

   ```text
   https://reserveit-api.onrender.com/api/v1/movies
   ```

   A JSON response (including an empty list) proves that the API URL works. A browser `Cannot GET /` response at the bare API domain is expected because this app has no root route.

### 3. Deploy the frontend to Vercel

1. In Vercel, import the repository and set **Root Directory** to `apps/frontend`.
2. Vercel detects Vite. Use `bun run build` as the build command and `dist` as the output directory if it does not prefill them.
3. Add this environment variable:

   ```dotenv
   VITE_API_BASE_URL=https://reserveit-api.onrender.com/api/v1
   ```

   Replace the hostname with the Render URL from the previous step. Variables beginning with `VITE_` are included in the browser build, so never store secrets in them.

4. Deploy. Vercel shows the public URL in the deployment summary, for example `https://reserveit.vercel.app`. Open it in a browser and copy it.

The included `apps/frontend/vercel.json` rewrites all routes to `index.html`, so direct links such as `/movies/:movieId` continue to work after deployment.

### 4. Connect the services

1. In Render, set `FRONTEND_URL` to the Vercel URL, with no trailing slash:

   ```dotenv
   FRONTEND_URL=https://reserveit.vercel.app
   ```

2. Redeploy the Render service after saving that variable.
3. In Razorpay Dashboard, create a webhook for:

   ```text
   https://reserveit-api.onrender.com/api/v1/webhooks/razorpay
   ```

   Subscribe to `payment.captured` and set its secret to the same value used for `RAZORPAY_WEBHOOK_SECRET`.

### Deployment URL checklist

| Check                             | Expected result                                       |
| --------------------------------- | ----------------------------------------------------- |
| Render API URL + `/api/v1/movies` | JSON response, not a browser error page               |
| Vercel URL                        | ReserveIt movie page loads                            |
| Browser DevTools > Network        | API requests go to the Render domain, not `localhost` |
| Login or registration             | No CORS error in the browser console                  |
| Razorpay webhook dashboard        | Test delivery returns HTTP 200                        |

When using a custom domain, update `VITE_API_BASE_URL` only if the API domain changes, update `FRONTEND_URL` to the new frontend domain, then redeploy the affected service.

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
