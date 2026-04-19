import axios from "axios";
import { API_BASE_URL } from "./runtime";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const isAuthRequest = (url = "") => {
  const normalized = String(url).toLowerCase();
  return (
    normalized.includes("/auth/login") || normalized.includes("/auth/register")
  );
};

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If token expires, redirect to admin login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const hadAuthHeader = Boolean(err.config?.headers?.Authorization);
    const requestUrl = err.config?.url;

    if (status === 401 && hadAuthHeader && !isAuthRequest(requestUrl)) {
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  },
);

export default api;
