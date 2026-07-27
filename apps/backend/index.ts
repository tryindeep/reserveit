import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser"
import { db } from "@repo/db";
import { errorHandler } from "./utils/errorHandler";
const app = express();




// Webhook router FIRST — needs raw body, must run before bodyParser.json()
import { webhookRouter } from "./routes/webhook.routes";
app.use("/api/v1/webhooks", webhookRouter);

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// configuring a body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

// Routers
import { movieRouter } from "./routes/movie.routes"
import { theaterRouter } from "./routes/theater.routes";
import { theaterMovieRouter } from "./routes/theaterMovie.routes";
import { screenRouter } from "./routes/screen.routes";
import { showtimeRouter } from "./routes/showtime.routes";
import { seatRouter } from "./routes/seat.routes";
import { bookingRouter } from "./routes/booking.routes";
//service 
import { BookingService } from "./services/booking.service";
import { clientRouter } from "./routes/client.routes";
import { paymentRouter } from "./routes/payment.routes";
import { authRouter } from "./routes/auth.routes";

app.use("/api/v1/auth", authRouter);

//versions of routes \\
//movie
app.use("/api/v1/movies" , movieRouter);

//theater
app.use("/api/v1/theaters", theaterRouter);

//theaterMovie
app.use("/api/v1/theaters", theaterMovieRouter);

//Screen
app.use("/api/v1/" , screenRouter);

//ShowTime
app.use("/api/v1/" , showtimeRouter);

// seat 
app.use("/api/v1" , seatRouter);

// bookings
app.use("/api/v1/bookings" , bookingRouter);

//client 
app.use("/api/v1/clients", clientRouter);

//payment
app.use("/api/v1/payments", paymentRouter);

// Sweep for abandoned holds every 60 seconds
setInterval(async () => {
  try {
    const count = await BookingService.expireStaleBookings();
    if(count > 0) console.log(`Expired ${count} stale booking(s)`);
  } catch (error) {
    console.error("Error while expiring stale bookings:", error);
  }
}, 60_000);

// Central error handler — MUST come after all routes
app.use(errorHandler);

// linking with Database
async function main() {
    await db.$connect(); // fails fast if neon/pool is unreachable
    app.listen(process.env.PORT,() => {
        console.log(`Sever started on port ${process.env.PORT} !!`)
    });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});

// graceful shutdown
process.on("SIGINT", async () => {
  await db.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await db.$disconnect();
  process.exit(0);
});

// What SIGINT and SIGTERM are:

// SIGINT ("signal interrupt") — sent when you press Ctrl+C in the terminal to stop your running server manually.
// SIGTERM ("signal terminate") — sent by process managers, Docker, hosting platforms (like Railway/Render), or kill commands when they want your app to shut down gracefully (as opposed to SIGKILL, which force-kills with no chance to clean up).

// Why you care about this for your Prisma setup:
// When your backend process dies, if you don't close the Prisma connection pool explicitly, you can get:

// Connections lingering open on Neon's side until they time out
// Slightly slower restarts in dev (Bun's hot-reload especially) because Prisma tries to reuse a pool that's in a weird state
// In production, if you're deploying with rolling restarts, unclosed connections pile up until you hit Neon's connection limit.
