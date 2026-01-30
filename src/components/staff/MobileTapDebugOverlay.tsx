import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTapDebugOverlayProps {
  lastTap: string;
}

/**
 * Mobile-only debug overlay to show tap events.
 * Only shown when: isMobile && localStorage.getItem('DEBUG_TAPS') === '1'
 * 
 * To enable: localStorage.setItem('DEBUG_TAPS', '1'); then refresh
 * To disable: localStorage.removeItem('DEBUG_TAPS'); then refresh
 */
export const MobileTapDebugOverlay = ({ lastTap }: MobileTapDebugOverlayProps) => {
  const isMobile = useIsMobile();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEnabled(localStorage.getItem('DEBUG_TAPS') === '1');
    }
  }, []);

  if (!isMobile || !enabled || !lastTap) return null;

  return (
    <div className="fixed bottom-20 left-2 right-2 z-[100] bg-black/90 text-green-400 font-mono text-xs p-2 rounded shadow-lg pointer-events-none">
      <div className="truncate">{lastTap}</div>
    </div>
  );
};

/**
 * Hook to manage tap logging for debugging
 */
export const useTapDebug = () => {
  const [lastTap, setLastTap] = useState("");

  const logTap = (msg: string) => {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    setLastTap(`${timestamp} ${msg}`);
  };

  return { lastTap, logTap };
};
