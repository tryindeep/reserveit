import bcrypt from "bcryptjs";
import { db } from "..";
import { number } from "zod";

const SEAT_TYPE_MULTIPLIER: Record<string, number> = {
  STANDARD: 1,
  PREMIUM: 1.25,
  RECLINER: 1.5,
  VIP: 2,
};

async function main () {
    console.log("🌱 Seeding...");

    const adminEmail = "admin@reservit.com";
    let admin = await db.user.findUnique({where : {email : adminEmail}});
    if(!admin){
        admin = await db.user.create({
            data : {
                email: adminEmail,
                passwordHash : await bcrypt.hash("Admin@12345", 10),
                name : "System Admin",
                role : "SYSTEM_ADMIN"
            }
        });
        console.log("✅ Admin created:", admin.email, "/ Admin@12345");
    }else {
        console.log("↪️  Admin already exists");
    }

    const clientEmail = "client@reservit.com";
    let clientUser = await db.user.findUnique({where : {email :clientEmail}, include : {ClientProfile : true}})
    if(!clientUser) {
        clientUser = await db.user.create({
            data : {
                email : clientEmail,
                passwordHash : await bcrypt.hash("Client@12345" , 10),
                name: "Demo Client",
                role : "CLIENT",
                ClientProfile : {
                    create : {
                        businessName : "Demo Cinemas Pvt Ltd" ,
                        status : "APPROVED",
                        approvedBy : admin.id,
                        approvedAt : new Date(),
                    },
                },
            },
            include : {ClientProfile : true}
        });
        console.log("✅ Client created:", clientUser.email, "/ Client@12345");
    }else {
        console.log("↪️  Client already exists");
    }
    const clientId = clientUser.ClientProfile!.id;

    const customerEmail = "customer@reservit.com";
    let customer = await db.user.findUnique({ where: { email: customerEmail } });
    if (!customer) {
        customer = await db.user.create({
        data: {
            email: customerEmail,
            passwordHash: await bcrypt.hash("Customer@12345", 10),
            name: "Demo Customer",
            role: "CUSTOMER",
        },
        });
        console.log("✅ Customer created:", customer.email, "/ Customer@12345");
    } else {
        console.log("↪️  Customer already exists");
    }

    let movie = await db.movie.findFirst({ where: { name: "Inception" } });
    if (!movie) {
        movie = await db.movie.create({
        data: {
            name: "Inception",
            description: "A thief who steals corporate secrets through dream-sharing technology.",
            casts: ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
            director: "Christopher Nolan",
            trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
            releaseDate: new Date("2010-07-16"),
            releaseStatus: "RELEASED",
            durationMins: 148,
        },
        });
        console.log("✅ Movie created:", movie.name);
    } else {
        console.log("↪️  Movie already exists");
    }

    let theater = await db.theater.findFirst({ where: { name: "Demo PVR", clientId } });
        if (!theater) {
            theater = await db.theater.create({
            data: { name: "Demo PVR", city: "Bengaluru", address: "MG Road, Bengaluru", clientId },
            });
            console.log("✅ Theater created:", theater.name);
        } else {
            console.log("↪️  Theater already exists");
        }

    let screen = await db.screen.findFirst({ where: { theaterId: theater.id, name: "Screen 1" } });
    if (!screen) {
        screen = await db.screen.create({
        data: { name: "Screen 1", totalSeats: 40, theaterId: theater.id, screenType: "STANDARD" },
        });
        console.log("✅ Screen created:", screen.name);
    } else {
        console.log("↪️  Screen already exists");
    }

    const seatCount = await db.seat.count({where : {screenId : screen.id}});
    if(seatCount === 0){
        const rowLetters = ["A","B","C","D"];
        const seatsData = rowLetters.flatMap((row) =>
        Array.from({ length: 10 }, (_, i) => ({
            screenId: screen!.id,
            row,
            number: i + 1,
            seatType: row === "D" ? "PREMIUM" : "STANDARD",
        }))
    );
        await db.seat.createMany({data : seatsData as any});
        console.log(`✅ Generated ${seatsData.length} seats`);
    }else{
        console.log("↪️  Seats already exist");
    }

    let showtime = await db.showtime.findFirst({where : {screenId : screen.id , movieId : movie.id}});
    if(!showtime){
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(18, 0, 0, 0);
        const endTime = new Date(startTime.getTime() +  (movie.durationMins ?? 150) * 60_000);
        const basePrice = 250;

        showtime = await db.$transaction(async(tx) => {
            const created = await tx.showtime.create({
                data :  { movieId: movie!.id, screenId: screen!.id, startTime, endTime, price: basePrice },
            });

            const seats = await tx.seat.findMany({where : {screenId :screen!.id}});
             await tx.showtimeSeat.createMany({
                data: seats.map((seat) => ({
                showtimeId: created.id,
                seatId: seat.id,
                price: Math.round(basePrice * (SEAT_TYPE_MULTIPLIER[seat.seatType] ?? 1) * 100) / 100,
                status: "AVAILABLE",
            })),
            });
            return created;
        });
        console.log("✅ Showtime created with seat inventory:", showtime.startTime);
    }else {
        console.log("↪️  Showtime already exists");
    }

    console.log("\n🌱 Seed complete. Test accounts:");
    console.log("   Admin:    admin@reservit.com / Admin@12345");
    console.log("   Client:   client@reservit.com / Client@12345");
    console.log("   Customer: customer@reservit.com / Customer@12345");
}

main().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  }).finally(() => db.$disconnect());


//   The best way to understand it is to go through it exactly as an interviewer or senior engineer would: in small sections, explaining every line, every keyword, and why it's written that way.

// I recommend breaking it into 8 parts:

// Imports + Constants
// import
// Record<string, number>
// SEAT_TYPE_MULTIPLIER

// Creating the Admin
// findUnique
// if (!admin)
// bcrypt.hash
// db.user.create

// Creating Client & ClientProfile
// Nested writes
// include
// ClientProfile!

// Creating Customer, Movie, Theater, Screen
// findFirst
// create
// Why findFirst vs findUnique

// Generating Seats
// count
// flatMap
// Array.from
// createMany

// Creating Showtime
// Date
// setHours
// setDate
// durationMins


// Transaction
// $transaction
// findMany
// map
// Math.round
// ??
// createMany


// Running the Script
// main()
// .catch()
// .finally()
// db.$disconnect()