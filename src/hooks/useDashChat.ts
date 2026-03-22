import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DashMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structured?: DashStructuredEvent[];
};

export type DashStructuredEvent = {
  type: "source_card" | "data_table" | "action_preview" | "approval_request" | "execution_result" | "clarification";
  data: any;
};

const DASH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dash-command`;

function generateSessionId() {
  return crypto.randomUUID();
}

export function useDashChat() {
  const [messages, setMessages] = useState<DashMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateSessionId);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  // Load last active session on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadLastSession = async () => {
      try {
        const { data } = await supabase
          .from("dash_sessions")
          .select("id, messages_json")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || !data?.messages_json) return;

        const msgs = (data.messages_json as any[])
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(),
          }));

        if (msgs.length > 0) {
          setSessionId(data.id);
          setMessages(msgs);
        }
      } catch {
        // Silently fail — fresh session is fine
      }
    };

    loadLastSession();
    return () => { cancelled = true; };
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg: DashMessage = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in");

      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      abortRef.current = new AbortController();

      const resp = await fetch(DASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history, session_id: sessionId }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error("Rate limit exceeded. Please wait a moment.");
        if (resp.status === 402) throw new Error("AI credits depleted. Please add credits in workspace settings.");
        const errBody = await resp.json().catch(() => ({ error: "Connection failed" }));
        throw new Error(errBody.error || "Failed to connect to Dash");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent, timestamp: new Date() }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Dash chat error:", err);
      setError(err.message);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, sessionId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setSessionId(generateSessionId());
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat, cancelStream, sessionId };
}
