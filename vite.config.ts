import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        importScripts: ["/custom-sw.js"],
      },
      manifest: {
        name: "График за дежурства – СУ Константин Петканов",
        short_name: "Дежурства",
        description: "График за дежурства на учители – СУ Константин Петканов, Бургас",
        theme_color: "#1e3a8a",
        background_color: "#f5f7fa",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        id: "/?v=20260911-calendar",
        lang: "bg",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/pwa-calendar-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-calendar-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-calendar-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
