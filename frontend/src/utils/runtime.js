const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = explicitApiUrl
  ? trimTrailingSlash(explicitApiUrl)
  : "http://localhost:5000/api";

export const SOCKET_URL = explicitApiUrl
  ? API_BASE_URL.replace(/\/api$/, "")
  : "http://localhost:5000";
