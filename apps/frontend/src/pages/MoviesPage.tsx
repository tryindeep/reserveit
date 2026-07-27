import { useEffect, useState } from "react";
import type { Movie } from "../types/types";
import { Link } from "react-router-dom";
import { getAllMovies } from "../api/movies";

export default function MoviePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllMovies().then(setMovies).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading Movies....</p>;

  return (
    <div>
      <h1>Movies</h1>
      {movies.map((movie) => (
        <div key={movie.id}>
          <Link to={`/movies/${movie.id}`}>{movie.name}</Link>
        </div>
      ))}
    </div>
  );
}