import "dotenv/config";
import express from "express";
import bodyParser from "body-parser"
import { db } from "@repo/db";
import { errorHandler } from "./utils/errorHandler";
const app = express();

// configuring a body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

// Routers
import {movieRouter} from "./routes/movie.routes"
import { theaterRouter } from "./routes/theater.routes";

//versions
app.use("/api/v1/movies" , movieRouter);
app.use("/api/v1/theaters", theaterRouter);

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
