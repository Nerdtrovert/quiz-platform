const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const normalizePath = (path) => {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

const basePath = (() => {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "";
  return trimTrailingSlash(base);
})();

export const buildAppPath = (path = "/") => {
  const normalizedPath = normalizePath(path);
  return basePath ? `${basePath}${normalizedPath}` : normalizedPath;
};

const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = explicitApiUrl
  ? trimTrailingSlash(explicitApiUrl)
  : `${window.location.origin}/api`;

export const SOCKET_URL = explicitApiUrl
  ? API_BASE_URL.replace(/\/api$/, "")
  : window.location.origin;
