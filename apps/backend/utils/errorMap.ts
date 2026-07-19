import type { Response } from "express";
import { sendError } from "./responseBody";

// One central map: error code -> [statusCode, message]
const ERROR_MAP: Record<string, [number, string]> = {
  THEATER_NOT_FOUND: [404, "Theater not found"],
  MOVIE_NOT_FOUND: [404, "Movie not found"],
  SCREEN_NOT_FOUND: [404, "Screen not found"],
  SHOWTIME_NOT_FOUND: [404, "Showtime not found"],
  SEAT_NOT_FOUND: [404, "Seat not found"],
  BOOKING_NOT_FOUND: [404, "Booking not found"],
  NOT_FOUND: [404, "Resource not found"],

  FORBIDDEN: [403, "You do not have permission to perform this action"],

  ALREADY_EXISTS: [409, "This resource already exists"],
  OVERLAP: [409, "This screen already has a showtime overlapping this time range"],
  SEATS_ALREADY_EXIST: [409, "Seats already generated for this screen"],
  SEAT_ALREADY_TAKEN: [409, "One or more selected seats are already held or booked"],
  NOT_PENDING: [409, "This booking is not in a confirmable state"],
  NOT_CANCELLABLE: [409, "This booking cannot be cancelled"],

  INVALID_SEATS: [400, "One or more seats do not belong to this showtime"],

  EXPIRED: [410, "This booking hold has expired"],

  EMAIL_EXISTS: [409, "An account with this email already exists"],
  INVALID_CREDENTIALS: [401, "Invalid email or password"],

  CLIENT_NOT_FOUND: [404, "Client not found"],
  ALREADY_PROCESSED: [409, "This client has already been approved or rejected"],
};

export const handleServiceError = (res: Response, error: string) => {
  const entry = ERROR_MAP[error];
  if (!entry) {
    // Fallback for any error code you forgot to add to the map —
    // better to surface a generic 400 than silently do nothing
    return sendError(res, 400, `Unhandled error: ${error}`);
  }
  const [statusCode, message] = entry;
  return sendError(res, statusCode, message);
};