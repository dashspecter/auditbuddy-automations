import { useState, useRef, useCallback, useEffect } from "react";

// Vendor-prefixed SpeechRecognition for Safari/older browsers
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export type SpeechLocale = "ro-RO" | "en-US";

interface UseSpeechRecognitionOptions {
  /** Primary locale — defaults to ro-RO */
  locale?: SpeechLocale;
  /** Auto-stop after this many ms of silence. Default: 4000 */
  silenceTimeoutMs?: number;
  /** Hard max recording time in ms. Default: 60000 (1 min) */
  maxDurationMs?: number;
  /** Called with the final transcript when speech ends */
  onResult?: (transcript: string) => void;
  /** Called on every interim (partial) result */
  onInterim?: (interimText: string) => void;
}

export function useSpeechRecognition({
  locale = "ro-RO",
  silenceTimeoutMs = 4000,
  maxDurationMs = 60000,
  onResult,
  onInterim,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef("");

  const isSupported = !!SpeechRecognitionAPI;

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearTimers]);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    // Stop any existing session first
    if (recognitionRef.current) {
      stop();
    }

    setError(null);
    accumulatedRef.current = "";

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = locale;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      // Reset silence timer on every result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        accumulatedRef.current += (accumulatedRef.current ? " " : "") + finalTranscript.trim();
        onInterim?.(accumulatedRef.current);
      } else if (interimTranscript) {
        onInterim?.(accumulatedRef.current + (accumulatedRef.current ? " " : "") + interimTranscript.trim());
      }

      // Restart silence timer — auto-stop if no new speech
      silenceTimerRef.current = setTimeout(() => {
        if (accumulatedRef.current.trim()) {
          onResult?.(accumulatedRef.current.trim());
        }
        stop();
      }, silenceTimeoutMs);
    };

    recognition.onerror = (event: any) => {
      const errorMap: Record<string, string> = {
        "not-allowed": "Microphone permission denied. Please allow microphone access in your browser settings.",
        "no-speech": "No speech detected. Try again.",
        "audio-capture": "No microphone found. Please connect a microphone.",
        "network": "Network error during voice recognition. Check your connection.",
        "aborted": "", // User-initiated stop, not an error
      };
      const message = errorMap[event.error] ?? `Voice recognition error: ${event.error}`;
      if (message) setError(message);
      stop();
    };

    recognition.onend = () => {
      // Deliver accumulated transcript if we have one and haven't already
      if (accumulatedRef.current.trim() && isListening) {
        onResult?.(accumulatedRef.current.trim());
      }
      clearTimers();
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      setError(`Failed to start voice input: ${err.message}`);
      setIsListening(false);
      recognitionRef.current = null;
      return;
    }

    // Hard max duration safety stop
    maxTimerRef.current = setTimeout(() => {
      if (accumulatedRef.current.trim()) {
        onResult?.(accumulatedRef.current.trim());
      }
      stop();
    }, maxDurationMs);
  }, [locale, silenceTimeoutMs, maxDurationMs, onResult, onInterim, stop, clearTimers]);

  const toggle = useCallback(() => {
    if (isListening) {
      // Deliver what we have so far
      if (accumulatedRef.current.trim()) {
        onResult?.(accumulatedRef.current.trim());
      }
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop, onResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, [clearTimers]);

  return { isSupported, isListening, error, start, stop, toggle };
}
