import axios from "axios";

import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
    baseURL:"http://localhost:4000/api/v1", 
})


apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if(token){
        config.headers.Authorization=`Bearer ${token}`;
    }
    return config;
})

// If the backend ever returns 401, log the user out automatically
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);