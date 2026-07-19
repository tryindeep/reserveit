# Reservit API — Routes & Test Data Reference

Base URL: `http://localhost:3000/api/v1`

Use this alongside Postman. For any route marked **Auth**, add header:
```
Authorization: Bearer <token>
```

---

## 1. Auth

### Register Customer
`POST /auth/register`
```json
{
  "email": "testuser1@reservit.com",
  "password": "TestPass@12345",
  "name": "Test User One",
  "phone": "9876543210"
}
```

### Register Second Customer (for race-condition test)
`POST /auth/register`
```json
{
  "email": "testuser2@reservit.com",
  "password": "TestPass@12345",
  "name": "Test User Two",
  "phone": "9876543211"
}
```

### Register Client (creates PENDING client account)
`POST /auth/register/client`
```json
{
  "email": "newclient@reservit.com",
  "password": "ClientPass@12345",
  "name": "New Theater Owner",
  "phone": "9123456780",
  "businessName": "Skyline Cinemas Pvt Ltd"
}
```

### Login — Admin (seeded)
`POST /auth/login`
```json
{
  "email": "admin@reservit.com",
  "password": "Admin@12345"
}
```

### Login — Client (seeded, already approved)
`POST /auth/login`
```json
{
  "email": "client@reservit.com",
  "password": "Client@12345"
}
```

### Login — Customer (seeded)
`POST /auth/login`
```json
{
  "email": "customer@reservit.com",
  "password": "Customer@12345"
}
```

> Copy the `token` from each login response — you'll need `adminToken`, `clientToken`, `customerToken`, `customer2Token` for the rest of this doc.

---

## 2. Movies

### Create Movie — **Auth: Admin**
`POST /movies`
```json
{
  "name": "Interstellar",
  "description": "A team of explorers travel through a wormhole in space.",
  "casts": ["Matthew McConaughey", "Anne Hathaway"],
  "director": "Christopher Nolan",
  "trailerUrl": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "language": "English",
  "releaseDate": "2014-11-07",
  "releaseStatus": "RELEASED"
}
```

### Get All Movies
`GET /movies`

### Search Movies by Name
`GET /movies/search?name=incep`

### Get Movie By Id
`GET /movies/:id`

### Update Movie — **Auth: Admin**
`PATCH /movies/:id`
```json
{
  "description": "Updated description for testing PATCH."
}
```

### Delete Movie — **Auth: Admin**
`DELETE /movies/:id`

---

## 3. Theaters

### Create Theater — **Auth: Client (approved)**
`POST /theaters`
```json
{
  "name": "Skyline Multiplex",
  "description": "A premium movie experience",
  "city": "Mumbai",
  "address": "Andheri West, Mumbai",
  "state": "Maharashtra",
  "pincode": "400058",
  "totalScreens": 3,
  "amenities": ["Parking", "Food Court", "Wheelchair Access"]
}
```

### Get All Theaters
`GET /theaters`

### Get Theaters — filter by city
`GET /theaters?city=Bengaluru`

### Search Theaters by Name
`GET /theaters/search?name=PVR`

### Get Theater By Id
`GET /theaters/:id`

### Update Theater — **Auth: Owner Client**
`PATCH /theaters/:id`
```json
{
  "description": "Updated theater description"
}
```

### Delete Theater — **Auth: Owner Client**
`DELETE /theaters/:id`

---

## 4. Theater–Movie Links

### Add Movie to Theater — **Auth: Admin**
`POST /theaters/:theaterId/movies/:movieId`
*(no body)*

### Bulk Add Movies to Theater — **Auth: Admin**
`POST /theaters/:theaterId/movies/bulk`
```json
{
  "movieIds": ["<movieId1>", "<movieId2>"]
}
```

### Get Movies Running in a Theater
`GET /theaters/:theaterId/movies`

### Get Theaters Showing a Movie
`GET /theaters/movies/:movieId/theaters`

### Remove Movie from Theater — **Auth: Admin**
`DELETE /theaters/:theaterId/movies/:movieId`

---

## 5. Screens

### Create Screen — **Auth: Owner Client**
`POST /theaters/:theaterId/screens`
```json
{
  "name": "Screen A",
  "totalSeats": 40,
  "screenType": "IMAX"
}
```
Valid `screenType`: `STANDARD` | `IMAX` | `FOUR_DX` | `GOLD_CLASS` | `RECLINER`

### Get Screens By Theater
`GET /theaters/:theaterId/screens`

### Get Screen By Id
`GET /screens/:id`

### Update Screen — **Auth: Owner Client**
`PATCH /screens/:id`
```json
{
  "totalSeats": 45
}
```

### Delete Screen — **Auth: Owner Client**
`DELETE /screens/:id`

---

## 6. Seats

### Generate Seats — **Auth: Owner Client**
`POST /screens/:screenId/seats/generate`
```json
{
  "rows": 4,
  "seatsPerRow": 10,
  "seatType": "STANDARD"
}
```
Valid `seatType`: `STANDARD` | `PREMIUM` | `RECLINER` | `VIP`
> Fails with `SEATS_ALREADY_EXIST` if seats were already generated for this screen.

### Get Seats By Screen
`GET /screens/:screenId/seats`

---

## 7. Showtimes

### Create Showtime — **Auth: Owner Client**
`POST /showtimes`
```json
{
  "movieId": "<movieId>",
  "screenId": "<screenId>",
  "startTime": "2026-08-01T18:00:00.000Z",
  "price": 250
}
```
> Fails with `OVERLAP` if this screen already has a showtime in that time range.

### Get Showtimes By Screen
`GET /screens/:screenId/showtimes`

### Get Showtimes By Movie
`GET /movies/:movieId/showtimes`

### Get Showtime By Id
`GET /showtimes/:id`

### Get Showtime Seats (the seat map)
`GET /showtimes/:id/seats`

### Update Showtime — **Auth: Owner Client**
`PATCH /showtimes/:id`
```json
{
  "price": 300
}
```

### Delete Showtime — **Auth: Owner Client**
`DELETE /showtimes/:id`

---

## 8. Bookings

### Hold Seats — **Auth: Customer**
`POST /bookings/hold`
```json
{
  "showtimeId": "<showtimeId>",
  "seatIds": ["<seatId1>", "<seatId2>"]
}
```
> Copy the `id` from the response — that's your `bookingId`.
> Seats are held for **5 minutes**; if not confirmed, they auto-expire via the background sweep.

### Hold Same Seats with a Different Customer — expect `409 SEAT_ALREADY_TAKEN`
Repeat the same request above using `customer2Token`. This confirms your concurrency locking works.

### Get Booking By Id — **Auth: Booking Owner**
`GET /bookings/:id`

### Confirm Booking — **Auth: Booking Owner**
`POST /bookings/:id/confirm`
*(no body)*

### Cancel Booking — **Auth: Booking Owner**
`POST /bookings/:id/cancel`
*(no body)*

---

## Testing sequence (recommended order)

1. **Auth** → login as admin, client, customer, customer2 → save all 4 tokens
2. **Movies** → create a movie as admin → save `movieId`
3. **Theaters** → create a theater as client → save `theaterId`
4. **Theater–Movie** → add the movie to the theater
5. **Screens** → create a screen → save `screenId`
6. **Seats** → generate seats → `GET` seats to grab two `seatId`s
7. **Showtimes** → create a showtime → save `showtimeId`
8. **Bookings**:
   - Hold 2 seats as customer → confirm status `PENDING`, seats `LOCKED`
   - Try holding the *same* seats as customer2 → expect `409`
   - Confirm the booking → status `CONFIRMED`, seats `BOOKED`
   - Re-check `GET /showtimes/:id/seats` → those 2 seats now show `BOOKED`
   - Create a new hold with different seats, then **cancel** instead of confirming → seats should revert to `AVAILABLE`

## Permission checks worth testing

| Action | Wrong role used | Expected result |
|---|---|---|
| Create theater | Customer token | `403 Forbidden` |
| Create theater | Unapproved client token | `403` (via `requireApprovedClient`) |
| Update someone else's theater | Different client's token | `403 Forbidden` |
| Create movie | Client token | `403 Forbidden` |
| Confirm someone else's booking | Different customer's token | `403 Forbidden` |
