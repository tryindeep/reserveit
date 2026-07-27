import { useEffect, useState } from "react";
import type { Movie } from "../types/types";
import { Link } from "react-router-dom";
import { getAllMovies } from "../api/movies";
import { SiteHeader } from "../components/SiteHeader";

const artwork = ["photo-1489599849927-2ee91cede3ba", "photo-1517604931442-7e0c8ed2963c", "photo-1485846234645-a62644f84728", "photo-1485095329183-d0797cdc5676"];
const info = (movie: Movie) => [movie.durationMins ? `${movie.durationMins} min` : "Feature film", movie.director ? `Dir. ${movie.director}` : "In cinemas now"].join(" · ");

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAllMovies().then(setMovies).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="app-shell"><SiteHeader /><div className="loading">Finding tonight’s stories…</div></div>;
  return <div className="app-shell"><SiteHeader /><main className="page">
    <section className="movie-hero"><div><span className="eyebrow">The cinema, considered</span><h1>Every great night begins with a great story.</h1><p>Discover your next favourite film, choose the perfect seats, and let the lights go down.</p></div></section>
    <div className="section-top"><div><span className="eyebrow">Curated for you</span><h2>Now showing</h2></div><span className="movie-count">{String(movies.length).padStart(2, "0")} FILMS</span></div>
    {movies.length ? <section className="movie-grid">{movies.map((movie, index) => <Link className="movie-card" to={`/movies/${movie.id}`} key={movie.id}><div className="poster"><span className="poster-number">{String(index + 1).padStart(2, "0")}</span><img src={movie.posterUrl || `https://images.unsplash.com/${artwork[index % artwork.length]}?auto=format&fit=crop&w=700&q=82`} alt={`${movie.name} poster`} /></div><h3>{movie.name}</h3><p>{info(movie)}</p></Link>)}</section> : <div className="empty">There are no films scheduled right now. Check back shortly.</div>}
  </main></div>;
}
