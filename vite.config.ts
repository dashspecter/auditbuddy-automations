import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// Build timestamp for cache busting
const BUILD_TIME = Date.now().toString();

// Write build time to version.json at build time
const versionJsonPath = path.resolve(__dirname, "public/version.json");
try {
  const versionContent = JSON.stringify({ buildTime: BUILD_TIME, version: "1.0.1" }, null, 2);
  fs.writeFileSync(versionJsonPath, versionContent);
} catch {
  // Ignore errors in environments where fs is not available
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    include: ['react-quill'],
    exclude: ['@capacitor/camera', '@capacitor/core', '@capacitor/status-bar']
  },
  build: {
    // NOTE: We already have a PWA web manifest at /public/manifest.json.
    // Vite's build.manifest defaults to "manifest.json" which would conflict.
    manifest: "build-manifest.json",
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        app: path.resolve(__dirname, "src/main.tsx"),
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MB
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/kiosk/, /^\/mystery-shopper/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: false, // use existing /public/manifest.json
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
