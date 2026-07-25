import axios from "axios";

export const apiClient = axios.create({
  baseURL : import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if(token){
    config.headers.Authorization = `Bearer ${token}`
  }
  return config;
});

apiClient.interceptors.response.use(   
  (res) => res,
  (error) => {
    if(error.response?.status === 401){
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login"; 
    }
    return Promise.reject(error);
  }
)