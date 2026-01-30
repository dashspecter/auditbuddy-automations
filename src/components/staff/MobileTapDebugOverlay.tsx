import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Copy, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

// Injected at build time
declare const __BUILD_TIME__: string;
const BUILD_ID = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";

interface MobileTapDebugOverlayProps {
  lastTap: string;
}

/**
 * Mobile-only debug overlay to show tap events, build info, and system status.
 * Only shown when: isMobile && (localStorage.getItem('DEBUG_TAPS') === '1' || ?debugTasks=1)
 * 
 * To enable: localStorage.setItem('DEBUG_TAPS', '1'); then refresh
 * To disable: localStorage.removeItem('DEBUG_TAPS'); then refresh
 */
export const MobileTapDebugOverlay = ({ lastTap }: MobileTapDebugOverlayProps) => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swStatus, setSwStatus] = useState<string>("checking...");
  const [loadedAt] = useState(() => new Date().toISOString().slice(11, 19));
  const [isClearing, setIsClearing] = useState(false);

  const urlEnabled = useMemo(() => searchParams.get("debugTasks") === "1", [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageEnabled = localStorage.getItem("DEBUG_TAPS") === "1";
    setEnabled(urlEnabled || storageEnabled);
  }, [urlEnabled]);

  // Track online status
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Check service worker status
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkSW = async () => {
      if (!("serviceWorker" in navigator)) {
        setSwStatus("not supported");
        return;
      }
      
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) {
          setSwStatus("none");
        } else {
          const controlling = navigator.serviceWorker.controller ? "yes" : "no";
          setSwStatus(`${regs.length} reg(s), ctrl=${controlling}`);
        }
      } catch {
        setSwStatus("error");
      }
    };
    
    checkSW();
  }, []);

  const handleClearCache = useCallback(async () => {
    setIsClearing(true);
    try {
      // Unregister all service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }

      // Clear Cache Storage
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }

      // Remove any build version keys
      localStorage.removeItem("app_build_version");
      sessionStorage.removeItem("app_build_reload_pending");
      sessionStorage.removeItem("sw:cleanup-done");

      toast.success("Cache cleared! Reloading...");
      
      // Hard reload with cache bust
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("_cb", Date.now().toString());
        window.location.replace(url.href);
      }, 500);
    } catch (e) {
      toast.error("Failed to clear cache");
      setIsClearing(false);
    }
  }, []);

  const handleCopyDebug = useCallback(() => {
    const debugInfo = [
      `Build: ${BUILD_ID}`,
      `Loaded: ${loadedAt}`,
      `Host: ${window.location.hostname}`,
      `Online: ${isOnline ? "yes" : "no"}`,
      `SW: ${swStatus}`,
      `Last: ${lastTap || "(none)"}`,
      `UA: ${navigator.userAgent.slice(0, 100)}`,
    ].join("\n");
    
    navigator.clipboard.writeText(debugInfo).then(() => {
      toast.success("Debug info copied!");
    }).catch(() => {
      toast.error("Copy failed");
    });
  }, [loadedAt, isOnline, swStatus, lastTap]);

  if (!isMobile || !enabled) return null;

  const env = window.location.hostname.includes("preview") ? "preview" : 
              window.location.hostname.includes("localhost") ? "local" : "prod";

  return (
    <div className="fixed bottom-20 left-2 right-2 z-[100] bg-black/95 text-green-400 font-mono text-[10px] p-3 rounded-lg shadow-lg">
      {/* Header with build info */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-green-900">
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-300">DEBUG</span>
          <span className="text-green-600">|</span>
          <span>Build: {BUILD_ID.slice(0, 10)}</span>
          <span className="text-green-600">|</span>
          <span>{env}</span>
        </div>
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-400" />
          )}
        </div>
      </div>

      {/* System status */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-[9px]">
        <div>Online: <span className={isOnline ? "text-green-300" : "text-red-400"}>{isOnline ? "yes" : "NO"}</span></div>
        <div>Loaded: {loadedAt}</div>
        <div className="col-span-2 truncate">SW: {swStatus}</div>
        <div className="col-span-2 truncate">Host: {window.location.hostname}</div>
      </div>

      {/* Last tap event */}
      <div className="bg-black/50 p-2 rounded mb-2">
        <div className="text-green-600 text-[9px] mb-1">Last event:</div>
        <div className="truncate text-green-300">
          {lastTap || "(debugTasks enabled) tap a checkbox…"}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyDebug}
          className="flex-1 flex items-center justify-center gap-1 bg-green-900/50 hover:bg-green-900 text-green-300 py-1.5 px-2 rounded text-[10px] active:scale-95 transition-transform"
        >
          <Copy className="h-3 w-3" />
          Copy Debug
        </button>
        <button
          onClick={handleClearCache}
          disabled={isClearing}
          className="flex-1 flex items-center justify-center gap-1 bg-red-900/50 hover:bg-red-900 text-red-300 py-1.5 px-2 rounded text-[10px] active:scale-95 transition-transform disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isClearing ? "animate-spin" : ""}`} />
          {isClearing ? "Clearing..." : "Clear Cache"}
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to manage tap logging for debugging
 */
export const useTapDebug = () => {
  const [lastTap, setLastTap] = useState("");

  const logTap = useCallback((msg: string) => {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    setLastTap(`${timestamp} ${msg}`);
  }, []);

  return { lastTap, logTap };
};

/**
 * Hook to check if device is online - for use in completion handlers
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};
