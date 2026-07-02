
import express from "express";
import { db } from "@repo/db";
const app = express();




async function main() {
    await db.$connect(); // fails fast if neon/pool is unreachable
    app.listen(3000,() => {
        console.log("listing on port 3000")
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
