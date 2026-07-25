export type User = {
    id : string;
    email :  string;
    name : string;
    role : "SYSTEM_ADMIN" | "CLIENT" | "CUSTOMER";
};

export type Movie = {
    id : string;
    name: string;
    description: string;
    casts: string[];
    director: string;
    trailerUrl : string;
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