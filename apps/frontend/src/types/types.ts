export type User = {
    id : string;
    email :  string;
    name : string;
    phone?: string | null;
    role : "SYSTEM_ADMIN" | "CLIENT" | "CUSTOMER";
};

export type Movie = {
    id : string;
    name: string;
    description: string;
    casts: string[];
    director: string;
    trailerUrl : string;
    posterUrl?: string | null;
    backdropUrl?: string | null;
    language?: string;
    releaseStatus?: "RELEASED" | "UPCOMING" | "CANCELLED";
    releaseDate: string;
    durationMins : number | null;
};

export type Showtime = {
  id : string,
  movieId  : string,
  screenId : string
  startTime : string;
  endTime  : string;
  price : number;
  screen?: {
    name: string;
    theater: { name: string; city: string; address: string };
  };
};

export type ShowtimeSeat = {
    id : string;
    seatId : string;
    price : number;
    status : "AVAILABLE" | "LOCKED" | "BOOKED";
    seat : {row : string , number : number, seatType : string};
}

export type Booking = {
    id : string;
    status :"PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
    totalAmount : number;
    expiresAt: string;
}

export type ApiResponse<T> = {
    success : boolean;
    data : T;
    message?: string;
    error ? : unknown; 
}
