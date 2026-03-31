import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
