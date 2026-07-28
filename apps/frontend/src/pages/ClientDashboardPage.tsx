import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { SiteHeader } from "../components/SiteHeader";
import { useAuthStore } from "../store/authStore";
type Theater = {
  id: string;
  name: string;
  city: string;
  address: string;
  screens: { id: string; name: string; totalSeats: number; screenType: string }[];
};
type Movie = { id: string; name: string };
export default function ClientDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [message, setMessage] = useState("");
  const [theaterMovies, setTheaterMovies] = useState<Movie[]>([]);
  const [screenForm, setScreenForm] = useState({
    theaterId: "",
    name: "Screen 1",
    totalSeats: "80",
    seatsPerRow: "10",
    screenType: "STANDARD",
  });
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    description: "",
    totalScreens: "1",
  });
  const [showtimeForm, setShowtimeForm] = useState({
    theaterId: "",
    screenId: "",
    movieId: "",
    startTime: "",
    price: "250",
  });
  const load = () =>
    Promise.all([
      apiClient.get("/clients/me"),
      apiClient.get("/clients/me/theaters"),
    ])
      .then(([p, t]) => {
        setProfile(p.data.data);
        setTheaters(t.data.data);
        if (!screenForm.theaterId && t.data.data.length) {
          setScreenForm((current) => ({ ...current, theaterId: t.data.data[0].id }));
        }
        setShowtimeForm((current) => ({
          ...current,
          theaterId: current.theaterId || t.data.data[0]?.id || "",
          screenId: current.screenId || t.data.data[0]?.screens[0]?.id || "",
        }));
      })
      .catch((e) =>
        setMessage(
          e.response?.data?.message ?? "Could not load partner details",
        ),
      );
  useEffect(() => {
    if (user?.role === "CLIENT") load();
  }, [user?.role]);
  useEffect(() => {
    if (!showtimeForm.theaterId) {
      setTheaterMovies([]);
      return;
    }
    apiClient.get(`/theaters/${showtimeForm.theaterId}/movies`)
      .then((response) => {
        const movies = response.data.data as Movie[];
        setTheaterMovies(movies);
        setShowtimeForm((current) => ({ ...current, movieId: movies.some((movie) => movie.id === current.movieId) ? current.movieId : movies[0]?.id || "" }));
      })
      .catch((err) => setMessage(err.response?.data?.message ?? "Could not load theatre movies."));
  }, [showtimeForm.theaterId]);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "CLIENT") return <Navigate to="/movies" replace />;
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/theaters", {
        ...form,
        totalScreens: Number(form.totalScreens),
        amenities: [],
      });
      setMessage(
        "Theatre created. Add screens and showtimes from its management API.",
      );
      setForm({
        name: "",
        city: "",
        address: "",
        description: "",
        totalScreens: "1",
      });
      load();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ??
          "Could not create theatre. Your partner account may still be awaiting approval.",
      );
    }
  };
  const createScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const totalSeats = Number(screenForm.totalSeats);
    const seatsPerRow = Number(screenForm.seatsPerRow);
    const rows = Math.ceil(totalSeats / seatsPerRow);
    try {
      const screen = await apiClient.post(
        `/theaters/${screenForm.theaterId}/screens`,
        { name: screenForm.name, totalSeats, screenType: screenForm.screenType },
      );
      await apiClient.post(`/screens/${screen.data.data.id}/seats/generate`, {
        rows,
        seatsPerRow,
        seatType: "STANDARD",
      });
      setMessage(`${screenForm.name} is ready with ${totalSeats} seats.`);
      setScreenForm((current) => ({ ...current, name: `Screen ${theaters.reduce((count, theater) => count + theater.screens.length, 0) + 2}` }));
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Could not create the screen.");
    }
  };
  const createShowtime = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await apiClient.post("/showtimes", {
        movieId: showtimeForm.movieId,
        screenId: showtimeForm.screenId,
        startTime: new Date(showtimeForm.startTime).toISOString(),
        price: Number(showtimeForm.price),
      });
      setMessage("Showtime published with a seat map and ticket prices.");
      setShowtimeForm((current) => ({ ...current, startTime: "" }));
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Could not publish the showtime.");
    }
  };
  const selectedTheater = theaters.find((theater) => theater.id === showtimeForm.theaterId);
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page">
        <span className="eyebrow">Theatre partner</span>
        <h1 className="title">
          {profile?.businessName || "Your cinema workspace"}
        </h1>
        <p className="subtitle">
          {profile?.status === "APPROVED"
            ? "Your account is approved. Create venues, screens, and showtimes."
            : "Your partner application is being reviewed. You’ll be able to manage venues once approved."}
        </p>
        {message && <p className="error">{message}</p>}
        <div className="dashboard-grid">
          <section className="dashboard-card">
            <span className="eyebrow">Your venues</span>
            <h2>
              {theaters.length} theatre{theaters.length === 1 ? "" : "s"}
            </h2>
            <div className="admin-list">
              {theaters.length ? (
                theaters.map((t) => (
                  <article key={t.id}>
                    <div>
                      <b>{t.name}</b>
                      <span>
                        {t.address}, {t.city} · {t.screens.length} screens
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">Your venue list is empty.</p>
              )}
            </div>
            <div className="screen-capacity-list">
              {theaters.flatMap((theater) =>
                theater.screens.map((screen) => (
                  <span key={screen.id}>{screen.name}: <b>{screen.totalSeats}</b> seats</span>
                )),
              )}
            </div>
          </section>
          <section className="dashboard-card">
            <span className="eyebrow">Venue setup</span>
            <h2>Add a theatre</h2>
            <form className="admin-form" onSubmit={create}>
              {Object.entries({
                name: "Theatre name",
                city: "City",
                address: "Address",
                description: "Description",
                totalScreens: "Number of screens",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key !== "description"}
                    type={key === "totalScreens" ? "number" : "text"}
                    min={key === "totalScreens" ? 1 : undefined}
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <button className="btn" disabled={profile?.status !== "APPROVED"}>
                Create theatre
              </button>
            </form>
          </section>
        </div>
        <section className="dashboard-card screen-setup-card">
          <span className="eyebrow">Screen setup</span>
          <h2>Set capacity for each screen</h2>
          <p className="muted">Choose the exact number of bookable seats and how many are in each row.</p>
          <form className="admin-form screen-form" onSubmit={createScreen}>
            <label>
              Theatre
              <select
                required
                value={screenForm.theaterId}
                onChange={(e) => setScreenForm({ ...screenForm, theaterId: e.target.value })}
              >
                {theaters.length ? theaters.map((theater) => <option key={theater.id} value={theater.id}>{theater.name}</option>) : <option value="">Create a theatre first</option>}
              </select>
            </label>
            <label>
              Screen name
              <input required value={screenForm.name} onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })} />
            </label>
            <label>
              Total seats
              <input required type="number" min="1" max="1000" value={screenForm.totalSeats} onChange={(e) => setScreenForm({ ...screenForm, totalSeats: e.target.value })} />
            </label>
            <label>
              Seats per row
              <input required type="number" min="1" max="50" value={screenForm.seatsPerRow} onChange={(e) => setScreenForm({ ...screenForm, seatsPerRow: e.target.value })} />
            </label>
            <label>
              Screen type
              <select value={screenForm.screenType} onChange={(e) => setScreenForm({ ...screenForm, screenType: e.target.value })}>
                <option value="STANDARD">Standard</option>
                <option value="IMAX">IMAX</option>
                <option value="FOUR_DX">4DX</option>
                <option value="GOLD_CLASS">Gold Class</option>
                <option value="RECLINER">Recliner</option>
              </select>
            </label>
            <p className="screen-layout-note">Layout: {Math.ceil(Number(screenForm.totalSeats || 0) / Number(screenForm.seatsPerRow || 1))} rows, up to {screenForm.seatsPerRow || 0} seats per row.</p>
            <button className="btn" disabled={!theaters.length || profile?.status !== "APPROVED"}>Create screen &amp; seats</button>
          </form>
        </section>
        <section className="dashboard-card screen-setup-card">
          <span className="eyebrow">Showtime setup</span>
          <h2>Set a time and ticket price</h2>
          <p className="muted">Movies must first be assigned by an administrator. Each new showtime creates its bookable seat map automatically.</p>
          <form className="admin-form screen-form" onSubmit={createShowtime}>
            <label>
              Theatre
              <select value={showtimeForm.theaterId} onChange={(e) => setShowtimeForm({ ...showtimeForm, theaterId: e.target.value, screenId: theaters.find((theater) => theater.id === e.target.value)?.screens[0]?.id || "" })}>
                {theaters.length ? theaters.map((theater) => <option key={theater.id} value={theater.id}>{theater.name}</option>) : <option value="">Create a theatre first</option>}
              </select>
            </label>
            <label>
              Screen
              <select value={showtimeForm.screenId} onChange={(e) => setShowtimeForm({ ...showtimeForm, screenId: e.target.value })}>
                {selectedTheater?.screens.length ? selectedTheater.screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>) : <option value="">Create a screen first</option>}
              </select>
            </label>
            <label>
              Assigned movie
              <select value={showtimeForm.movieId} onChange={(e) => setShowtimeForm({ ...showtimeForm, movieId: e.target.value })}>
                {theaterMovies.length ? theaterMovies.map((movie) => <option key={movie.id} value={movie.id}>{movie.name}</option>) : <option value="">No movies assigned yet</option>}
              </select>
            </label>
            <label>
              Starts at
              <input required type="datetime-local" value={showtimeForm.startTime} onChange={(e) => setShowtimeForm({ ...showtimeForm, startTime: e.target.value })} />
            </label>
            <label>
              Base price (₹)
              <input required type="number" min="1" value={showtimeForm.price} onChange={(e) => setShowtimeForm({ ...showtimeForm, price: e.target.value })} />
            </label>
            <button className="btn" disabled={!showtimeForm.screenId || !showtimeForm.movieId || profile?.status !== "APPROVED"}>Publish showtime</button>
          </form>
        </section>
      </main>
    </div>
  );
}
