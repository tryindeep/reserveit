import { useParams, Link } from "react-router-dom";
import type { Movie, Showtime } from "../types/types";
import { useEffect, useState } from "react";
import { getMovieById } from "../api/movies";
import { getShowtimesByMovie } from "../api/showtimes";
import { SiteHeader } from "../components/SiteHeader";

const time = (date: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
const day = (date: string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date));
export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>(); const [movie, setMovie] = useState<Movie | null>(null); const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  useEffect(() => { if (!movieId) return; getMovieById(movieId).then(setMovie); getShowtimesByMovie(movieId).then(setShowtimes); }, [movieId]);
  if (!movie) return <div className="app-shell"><SiteHeader /><div className="loading">Loading the feature…</div></div>;
  return <div className="app-shell"><SiteHeader /><main className="page">
    <section className="detail-hero"><div><Link className="eyebrow" to="/movies">← Back to films</Link><h1 className="title">{movie.name}</h1><div className="facts"><span className="fact">{movie.durationMins ? `${movie.durationMins} MIN` : "FEATURE FILM"}</span>{movie.director && <span className="fact">DIRECTED BY {movie.director.toUpperCase()}</span>}{movie.releaseDate && <span className="fact">{new Date(movie.releaseDate).getFullYear()}</span>}</div><p className="detail-copy">{movie.description || "A compelling story made for the big screen. Select a showtime below to plan your perfect cinema evening."}</p></div></section>
    <section className="showtime-panel"><span className="eyebrow">Choose a time</span><h2>When would you like to watch?</h2><p>All times are shown in your local timezone. Select a screening to choose seats.</p>{showtimes.length ? <div className="time-grid">{showtimes.map(s => <Link className="time" key={s.id} to={`/showtimes/${s.id}/seats`}><b>{time(s.startTime)}</b><span>{day(s.startTime)} · ₹{s.price}</span></Link>)}</div> : <div className="empty">No showtimes are available for this film yet.</div>}</section>
  </main></div>;
}
