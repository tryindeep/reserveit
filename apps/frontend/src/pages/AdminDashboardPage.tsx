import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { SiteHeader } from "../components/SiteHeader";
import { useAuthStore } from "../store/authStore";
import type { Movie } from "../types/types";
type Client = {
  id: string;
  businessName: string;
  user: { name: string; email: string; phone?: string };
  createdAt: string;
};
type Theater = { id: string; name: string; city: string };
const initial = {
  name: "",
  description: "",
  casts: "",
  director: "",
  trailerUrl: "",
  posterUrl: "",
  backdropUrl: "",
  language: "English",
  releaseDate: "",
  durationMins: "",
};
export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [assignment, setAssignment] = useState({ theaterId: "", movieId: "" });
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const load = () =>
    Promise.all([apiClient.get("/movies"), apiClient.get("/clients/pending"), apiClient.get("/theaters")])
      .then(([m, c, t]) => {
        setMovies(m.data.data);
        setClients(c.data.data);
        const venues = t.data.data.theaters as Theater[];
        setTheaters(venues);
        setAssignment((current) => ({
          theaterId: current.theaterId || venues[0]?.id || "",
          movieId: current.movieId || m.data.data[0]?.id || "",
        }));
      })
      .catch((e) =>
        setMessage(
          e.response?.data?.message ?? "Could not load dashboard data",
        ),
      );
  useEffect(() => {
    if (user?.role === "SYSTEM_ADMIN") load();
  }, [user?.role]);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "SYSTEM_ADMIN") return <Navigate to="/movies" replace />;
  const createMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      await apiClient.post("/movies", {
        ...form,
        casts: form.casts
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        durationMins: form.durationMins ? Number(form.durationMins) : undefined,
        releaseDate: new Date(form.releaseDate).toISOString(),
      });
      setForm(initial);
      setMessage("Movie published.");
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Could not publish movie");
    }
  };
  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await apiClient.patch(
        `/clients/${id}/status`,
        status === "APPROVED"
          ? { status }
          : { status, rejectionReason: "Please contact support for details." },
      );
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Could not update partner");
    }
  };
  const assignMovie = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await apiClient.post(`/theaters/${assignment.theaterId}/movies/${assignment.movieId}`);
      const theater = theaters.find((item) => item.id === assignment.theaterId);
      const movie = movies.find((item) => item.id === assignment.movieId);
      setMessage(`${movie?.name ?? "Movie"} is now assigned to ${theater?.name ?? "the theatre"}.`);
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Could not assign the movie to this theatre.");
    }
  };
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page">
        <span className="eyebrow">System administration</span>
        <h1 className="title">Control room</h1>
        <p className="subtitle">
          Manage the film catalogue and review cinema partner applications.
        </p>
        {message && <p className="error">{message}</p>}
        <div className="dashboard-grid">
          <section className="dashboard-card">
            <span className="eyebrow">Add to catalogue</span>
            <h2>Publish a movie</h2>
            <form className="admin-form" onSubmit={createMovie}>
              {Object.entries({
                name: "Title",
                director: "Director",
                casts: "Cast (comma separated)",
                language: "Language",
                trailerUrl: "Trailer URL",
                posterUrl: "Poster image URL",
                backdropUrl: "Backdrop image URL",
                releaseDate: "Release date",
                durationMins: "Duration (minutes)",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={[
                      "name",
                      "director",
                      "casts",
                      "trailerUrl",
                      "releaseDate",
                    ].includes(key)}
                    type={
                      key === "releaseDate"
                        ? "date"
                        : key === "durationMins"
                          ? "number"
                          : "text"
                    }
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="full">
                Synopsis
                <textarea
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <button className="btn">Publish movie</button>
            </form>
          </section>
          <section className="dashboard-card">
            <span className="eyebrow">Partner review</span>
            <h2>
              Pending cinemas <small>{clients.length}</small>
            </h2>
            <div className="admin-list">
              {clients.length ? (
                clients.map((c) => (
                  <article key={c.id}>
                    <div>
                      <b>{c.businessName}</b>
                      <span>
                        {c.user.name} · {c.user.email}
                      </span>
                    </div>
                    <div className="actions">
                      <button
                        className="btn"
                        onClick={() => decide(c.id, "APPROVED")}
                      >
                        Approve
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => decide(c.id, "REJECTED")}
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">No approvals waiting.</p>
              )}
            </div>
            <span className="eyebrow">Catalogue</span>
            <div className="admin-list compact">
              {movies.slice(0, 6).map((m) => (
                <article key={m.id}>
                  <div>
                    <b>{m.name}</b>
                    <span>
                      {m.director} · {m.language || "English"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="dashboard-card">
            <span className="eyebrow">Theatre programming</span>
            <h2>Assign a movie</h2>
            <p className="muted">Choose the theatre where a published film can be scheduled.</p>
            <form className="admin-form" onSubmit={assignMovie}>
              <label>
                Theatre
                <select required value={assignment.theaterId} onChange={(e) => setAssignment({ ...assignment, theaterId: e.target.value })}>
                  {theaters.length ? theaters.map((theater) => <option key={theater.id} value={theater.id}>{theater.name} · {theater.city}</option>) : <option value="">No theatres yet</option>}
                </select>
              </label>
              <label>
                Movie
                <select required value={assignment.movieId} onChange={(e) => setAssignment({ ...assignment, movieId: e.target.value })}>
                  {movies.length ? movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.name}</option>) : <option value="">No published movies yet</option>}
                </select>
              </label>
              <button className="btn" disabled={!assignment.theaterId || !assignment.movieId}>Assign movie</button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
