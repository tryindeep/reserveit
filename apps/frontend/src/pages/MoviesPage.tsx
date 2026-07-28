import { useEffect, useState } from "react";
import type { Movie } from "../types/types";
import { Link } from "react-router-dom";
import { getAllMovies } from "../api/movies";
import { SiteHeader } from "../components/SiteHeader";

const artwork = [
  "photo-1489599849927-2ee91cede3ba",
  "photo-1517604931442-7e0c8ed2963c",
  "photo-1485846234645-a62644f84728",
  "photo-1485095329183-d0797cdc5676",
];
const info = (movie: Movie) =>
  [
    movie.durationMins ? `${movie.durationMins} min` : "Feature film",
    movie.director ? `Dir. ${movie.director}` : "In cinemas now",
  ].join(" · ");

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAllMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="app-shell">
        <SiteHeader />
        <div className="loading">Finding tonight’s stories…</div>
      </div>
    );
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="page">
        <section className="movie-hero">
          <div className="hero-content">
            <span className="eyebrow">Your cinematic evening</span>
            <h1>Stories worth leaving home for.</h1>
            <p>
              Discover exceptional films, pick your perfect view, and make an
              evening of it.
            </p>
            <a className="hero-cta" href="#now-showing">Explore films <span>→</span></a>
          </div>
          <div className="hero-orb" aria-hidden="true"><span>NOW</span><b>SHOWING</b></div>
        </section>
        <div className="section-top" id="now-showing">
          <div>
            <span className="eyebrow">In theatres today</span>
            <h2>Choose your next escape</h2>
          </div>
          <span className="movie-count">
            {String(movies.length).padStart(2, "0")} FILMS
          </span>
        </div>
        {movies.length ? (
          <section className="movie-grid">
            {movies.map((movie, index) => (
              <Link
                className="movie-card reveal-card"
                to={`/movies/${movie.id}`}
                key={movie.id}
              >
                <div className="poster">
                  <span className="poster-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <img
                    src={
                      movie.posterUrl ||
                      `https://images.unsplash.com/${artwork[index % artwork.length]}?auto=format&fit=crop&w=700&q=82`
                    }
                    alt={`${movie.name} poster`}
                  />
                </div>
                <h3>{movie.name}</h3>
                <p>{info(movie)}</p>
              </Link>
            ))}
          </section>
        ) : (
          <div className="empty">
            There are no films scheduled right now. Check back shortly.
          </div>
        )}
      </main>
    </div>
  );
}
