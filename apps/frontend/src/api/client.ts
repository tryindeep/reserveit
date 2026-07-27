import axios from "axios";
import { useAuthStore } from "../store/authStore";


export const apiClient = axios.create({
  baseURL : import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// User clicks "View Movies"
//         │
//         ▼
// apiClient.get("/movies")
//         │
//         ▼
// Request Interceptor
//         │
//         ├── Read token
//         ├── Add Authorization header
//         │
//         ▼
// Backend API
//         │
//         ├── Token valid
//         │      │
//         │      ▼
//         │   Return movies (200)
//         │
//         └── Token invalid
//                │
//                ▼
//           Return 401
//                │
//                ▼
// Response Interceptor
//                │
//       Remove token & user
//                │
//       Redirect to /login
//                │
//       Reject Promise