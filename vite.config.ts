import { defineConfig, type ViteDevServer, type Connect } from "vite";
import type { ServerResponse } from "http";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";

function devScheduleApiPlugin() {
  return {
    name: "dev-schedule-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (!req.url?.startsWith("/api/schedule")) {
          return next();
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          return res.end();
        }

        const filePath = path.resolve(__dirname, "./public/schedule-data.json");

        if (req.url.includes("status=1") || req.url.includes("status=true")) {
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              connected: true,
              storageEngines: { dev: true },
              activeStorage: "Vite Dev Server (public/schedule-data.json)",
              timestamp: new Date().toISOString(),
            })
          );
        }

        if (req.method === "GET") {
          if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, "utf-8");
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            return res.end(data);
          }
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "File not found" }));
        }

        if (req.method === "POST") {
          let bodyStr = "";
          req.on("data", (chunk: Buffer | string) => {
            bodyStr += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(bodyStr);
              parsed.exportedAt = new Date().toISOString();
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              return res.end(
                JSON.stringify({
                  success: true,
                  storageType: "Vite Dev Server (public/schedule-data.json)",
                  exportedAt: parsed.exportedAt,
                  message: "Успешно записано в public/schedule-data.json!",
                })
              );
            } catch (err: unknown) {
              res.statusCode = 400;
              const errMsg = err instanceof Error ? err.message : "Invalid JSON";
              return res.end(JSON.stringify({ error: errMsg }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    devScheduleApiPlugin(),
    react(),
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
