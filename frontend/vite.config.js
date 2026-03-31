import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When using a dev tunnel (e.g. devtunnels.ms), set VITE_DEV_ORIGIN to your tunnel URL
// so the dev server and HMR use the correct origin (e.g. https://xxx-5173.inc1.devtunnels.ms).
const devOrigin = process.env.VITE_DEV_ORIGIN?.trim() || undefined;
const tunnelMode = !!devOrigin;
let hmrConfig = true;
if (devOrigin) {
  try {
    hmrConfig = { protocol: "wss", host: new URL(devOrigin).host, clientPort: 443 };
  } catch {
    hmrConfig = true;
  }
}

// Plugin: when using a tunnel, make the server listen on :: (dual-stack) so the tunnel
// client can reach us whether it connects via 127.0.0.1 or ::1 (Windows often uses ::1).
function devTunnelListen() {
  if (!tunnelMode) return null;
  return {
    name: "dev-tunnel-listen",
    configureServer(server) {
      const httpServer = server.httpServer;
      if (!httpServer) return;
      const originalListen = httpServer.listen.bind(httpServer);
      httpServer.listen = function (a1, a2, a3) {
        const callback = typeof a3 === "function" ? a3 : typeof a2 === "function" ? a2 : undefined;
        const opts = typeof a1 === "number"
          ? { port: a1, host: "::", ipv6Only: false }
          : typeof a1 === "object" && a1 !== null
            ? { ...a1, host: "::", ipv6Only: false }
            : { port: 5173, host: "::", ipv6Only: false };
        return callback ? originalListen(opts, callback) : originalListen(opts);
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), devTunnelListen()].filter(Boolean),
  server: {
    host: tunnelMode ? "::" : "0.0.0.0",
    port: 5174,
    strictPort: false,
    origin: devOrigin,
    headers: {
      "x-forwarded-proto": "https",
    },
    allowedHosts: "all",
    hmr: hmrConfig,
  },
});