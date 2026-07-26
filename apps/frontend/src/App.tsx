import { AuthProvider } from "./context/AuthContext"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import { ProtectedRoute } from "./components/ProtectedRoute"
import MoviesPage from "./pages/MoviesPage"
import MovieDetailPage from "./pages/MovieDetailPage"
import SeatPickerPage from "./pages/SeatPickerPage"
import BookingConfirmationPage from "./pages/BookingConfirmationPage"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/movies" element={<ProtectedRoute><MoviesPage /></ProtectedRoute>} />
            <Route path="/movies/:movieId" element={<ProtectedRoute><MovieDetailPage /></ProtectedRoute>} />
            <Route path="/showtimes/:showtimeId/seats" element={<ProtectedRoute><SeatPickerPage /></ProtectedRoute>} />
            <Route path="/bookings/:bookingId" element={<ProtectedRoute><BookingConfirmationPage /></ProtectedRoute>} />
          </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
