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
  },
  optimizeDeps: {
    include: ['react-quill'],
    exclude: ['@capacitor/camera', '@capacitor/core', '@capacitor/status-bar']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "dashspect-logo-512.png", "robots.txt"],
      manifest: {
        name: "Dashspect - Restaurant Compliance Management",
        short_name: "Dashspect",
        description: "Automated restaurant audit platform for location and staff compliance tracking",
        theme_color: "#1a1f2e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/dashspect-logo-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/dashspect-logo-512.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        // IMPORTANT: do NOT precache HTML. If index.html is cached, users can get stuck on old bundles.
        // Keep the app shell (navigation requests) NetworkFirst to always pick up the latest build.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache-v2",
              // Don’t fall back to cached HTML just because the network is slow.
              // This prevents users reopening the app later and seeing an old build.
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60, // 1 minute
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache-v2",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache-v2",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
