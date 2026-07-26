import { useParams, Link } from "react-router-dom"
import type { Movie , Showtime } from "../types/types"
import { useEffect, useState } from "react"
import { getMovieById } from "../api/movies";
import { getShowtimesByMovie } from "../api/showtimes"


export default function MovieDetailPage() {
    const {movieId} = useParams<{movieId : string}>();
    const [movie , setMovie] = useState<Movie |null>(null);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);

    useEffect(() => {
        if(!movieId) return;
        // getMovieById may have an incorrect/loose return type; coerce to Movie to satisfy setState
        getMovieById(movieId).then(setMovie);
        getShowtimesByMovie(movieId).then((s) => setShowtimes(s));
    },[movieId])

    return (
        <div>
            <h1>{movie?.name}</h1>
            <p>{movie?.description}</p>
            <h2>Showtimes</h2>
            {showtimes.map((s) => (
                <Link key={s.id} to={`/showtimes/${s.id}/seats`}>
                    {new Date(s.startTime).toLocaleString()} - {s.price}
                </Link>
            ))}
        </div>
    );
}