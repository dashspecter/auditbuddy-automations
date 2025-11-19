import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      },
      (error) => {
        console.log('ServiceWorker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById("root")!).render(<App />);
