import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type DashLocale = "ro" | "en";

export const DASH_STRINGS = {
  en: {
    placeholder: "Ask Dash anything about your operations...",
    listening: "Listening... speak now",
    attachFile: "Attach file",
    voiceInput: "Voice input",
    stopRecording: "Stop recording",
    loadOlder: "Load older messages",
    thinking: "Thinking…",
    history: "History",
    export: "Export",
    clear: "Clear",
    approve: "Approve & Execute",
    reject: "Reject",
    approved: "Approved & Executed",
    rejected: "Rejected",
    failed: "Failed — check result below",
    retry: "Retry",
    executing: "Executing...",
    undoIn: (n: number) => `Executing in ${n}s...`,
    undo: "Undo",
    lowRisk: "Low Risk",
    mediumRisk: "Medium Risk",
    highRisk: "High Risk",
    affected: "Affected:",
    missingFields: "Missing required fields:",
    noMessages: "Ask me anything about your operations.",
    suggestedLabel: "Try asking:",
  },
  ro: {
    placeholder: "Întreabă Dash orice despre operațiunile tale...",
    listening: "Ascult... vorbește acum",
    attachFile: "Atașează fișier",
    voiceInput: "Intrare vocală",
    stopRecording: "Oprește înregistrarea",
    loadOlder: "Încarcă mesaje mai vechi",
    thinking: "Procesez…",
    history: "Istoric",
    export: "Export",
    clear: "Șterge",
    approve: "Aprobă & Execută",
    reject: "Refuză",
    approved: "Aprobat & Executat",
    rejected: "Refuzat",
    failed: "Eroare — verifică rezultatul",
    retry: "Reîncearcă",
    executing: "Se execută...",
    undoIn: (n: number) => `Se execută în ${n}s...`,
    undo: "Anulează",
    lowRisk: "Risc Scăzut",
    mediumRisk: "Risc Mediu",
    highRisk: "Risc Ridicat",
    affected: "Afectat:",
    missingFields: "Câmpuri obligatorii lipsă:",
    noMessages: "Întreabă-mă orice despre operațiunile tale.",
    suggestedLabel: "Încearcă:",
  },
} as const;

interface DashLocaleContextValue {
  locale: DashLocale;
  t: typeof DASH_STRINGS["en"];
  setLocale: (l: DashLocale) => void;
  speechLocale: "ro-RO" | "en-US";
}

const DashLocaleContext = createContext<DashLocaleContextValue | null>(null);

function detectDefaultLocale(): DashLocale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language?.startsWith("ro") ? "ro" : "en";
}

export function DashLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<DashLocale>(() => {
    try {
      const saved = localStorage.getItem("dash-locale");
      if (saved === "ro" || saved === "en") return saved;
    } catch {}
    return detectDefaultLocale();
  });

  const setLocale = useCallback((l: DashLocale) => {
    setLocaleState(l);
    try { localStorage.setItem("dash-locale", l); } catch {}
  }, []);

  return (
    <DashLocaleContext.Provider value={{
      locale,
      t: DASH_STRINGS[locale],
      setLocale,
      speechLocale: locale === "ro" ? "ro-RO" : "en-US",
    }}>
      {children}
    </DashLocaleContext.Provider>
  );
}

export function useDashLocale() {
  const ctx = useContext(DashLocaleContext);
  if (!ctx) throw new Error("useDashLocale must be used inside DashLocaleProvider");
  return ctx;
}
