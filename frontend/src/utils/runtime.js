const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const isLoopbackHost = (host) =>
  ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    String(host || "").toLowerCase(),
  );
const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const explicitApiUrl = import.meta.env.VITE_API_URL?.trim();
const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
const isBrowser = typeof window !== "undefined";
const browserHost = isBrowser ? window.location.hostname : "";
const browserOrigin = isBrowser ? trimTrailingSlash(window.location.origin) : "";
const isLocalHost = isLoopbackHost(browserHost);
const isRemoteBrowser = isBrowser && !isLocalHost;

const explicitApiHost = parseUrl(explicitApiUrl)?.hostname;
const explicitSocketHost = parseUrl(explicitSocketUrl)?.hostname;
const isExplicitApiLocalOnly = isLoopbackHost(explicitApiHost);
const isExplicitSocketLocalOnly = isLoopbackHost(explicitSocketHost);

const inferredApiUrl = browserOrigin ? `${browserOrigin}/api` : "";
const defaultApiUrl = isLocalHost
  ? "http://localhost:5000/api"
  : inferredApiUrl || "http://localhost:5000/api";

const shouldUseExplicitApiUrl =
  Boolean(explicitApiUrl) && !(isRemoteBrowser && isExplicitApiLocalOnly);
export const API_BASE_URL = shouldUseExplicitApiUrl
  ? trimTrailingSlash(explicitApiUrl)
  : defaultApiUrl;

const defaultSocketUrl = shouldUseExplicitApiUrl
  ? API_BASE_URL.replace(/\/api\/?$/, "")
  : isLocalHost
    ? "http://localhost:5000"
    : browserOrigin || "http://localhost:5000";

const shouldUseExplicitSocketUrl =
  Boolean(explicitSocketUrl) &&
  !(isRemoteBrowser && isExplicitSocketLocalOnly);

export const SOCKET_URL = shouldUseExplicitSocketUrl
  ? trimTrailingSlash(explicitSocketUrl)
  : defaultSocketUrl;
