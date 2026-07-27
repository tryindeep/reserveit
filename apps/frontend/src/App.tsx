import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MoviesPage from "./pages/MoviesPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import SeatPickerPage from "./pages/SeatPickerPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ClientDashboardPage from "./pages/ClientDashboardPage";

function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<MoviesPage />} />
    <Route path="/movies" element={<MoviesPage />} />
    <Route path="/movies/:movieId" element={<MovieDetailPage />} />
    <Route path="/showtimes/:showtimeId/seats" element={<ProtectedRoute><SeatPickerPage /></ProtectedRoute>} />
    <Route path="/bookings/:bookingId" element={<ProtectedRoute><BookingConfirmationPage /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
    <Route path="/partner" element={<ProtectedRoute><ClientDashboardPage /></ProtectedRoute>} />
  </Routes></BrowserRouter>;
}
export default App;
