import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devOrigin = process.env.VITE_DEV_ORIGIN?.trim();

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    ...(devOrigin ? { origin: devOrigin } : {}),
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5174,
  },
});
