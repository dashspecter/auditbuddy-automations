import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DashAttachment } from "@/components/dash/DashInput";

export type DashMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structured?: DashStructuredEvent[];
  attachments?: DashAttachment[];
};

export type DashStructuredEvent = {
  type: "source_card" | "data_table" | "action_preview" | "approval_request" | "execution_result" | "clarification";
  data: any;
};

const DASH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dash-command`;

function generateSessionId() {
  return crypto.randomUUID();
}

/** Strip legacy transport markers from message content for display */
function sanitizeDisplayContent(content: string): string {
  return content
    .replace(/\n?\n?\[Attached files?:\s*[^\]]*\]/gi, "")
    .replace(/\n?\[File URLs?:\s*[^\]]*\]/gi, "")
    .replace(/\n?\[Attached:\s*[^\]]*\]/gi, "")
    .trim();
}

/** Build the backend transport text that includes file metadata */
function buildTransportText(displayText: string, attachments?: DashAttachment[]): string {
  if (!attachments || attachments.length === 0) return displayText;
  const names = attachments.map(a => a.name).join(", ");
  const urls = attachments.map(a => a.url).join(", ");
  return `${displayText}\n\n[Attached files: ${names}]\n[File URLs: ${urls}]`;
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
            content: sanitizeDisplayContent(m.content),
            timestamp: new Date(),
            structured: m.structured ? (m.structured as any[]).map((s: any) => ({
              type: s.event_type || s.type,
              data: s.data,
            })) : undefined,
            attachments: m.attachments as DashAttachment[] | undefined,
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

  const processStream = async (resp: Response, existingStructuredEvents?: DashStructuredEvent[]) => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const structuredEvents: DashStructuredEvent[] = existingStructuredEvents ? [...existingStructuredEvents] : [];

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
          if (parsed.type === "structured_event") {
            structuredEvents.push({ type: parsed.event_type, data: parsed.data });
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, structured: [...structuredEvents] } : m);
              }
              return [...prev, { role: "assistant", content: assistantContent, timestamp: new Date(), structured: [...structuredEvents] }];
            });
            continue;
          }
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent, structured: structuredEvents.length > 0 ? [...structuredEvents] : m.structured } : m);
              }
              return [...prev, { role: "assistant", content: assistantContent, timestamp: new Date(), structured: structuredEvents.length > 0 ? [...structuredEvents] : undefined }];
            });
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  };

  const sendDirectApproval = useCallback(async (pendingActionId: string, action: "approve" | "reject", executeTool?: string) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in");

      const history = messages.map(m => ({ role: m.role, content: buildTransportText(m.content, m.attachments) }));

      abortRef.current = new AbortController();

      const resp = await fetch(DASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: history,
          session_id: sessionId,
          direct_approval: {
            pending_action_id: pendingActionId,
            action,
            execute_tool: executeTool,
          },
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({ error: "Connection failed" }));
        throw new Error(errBody.error || "Failed to execute approval");
      }

      await processStream(resp);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Dash approval error:", err);
      setError(err.message);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, sessionId]);

  const sendMessage = useCallback(async (text: string, attachments?: DashAttachment[]) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    // Store only clean display text + attachments metadata in the UI message
    const userMsg: DashMessage = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
      attachments,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in");

      // Build transport text with file URLs for the backend only
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: buildTransportText(m.content, m.attachments),
      }));

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

      await processStream(resp);
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

  const clearChat = useCallback(async () => {
    if (user && sessionId) {
      try {
        await supabase.from("dash_sessions")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", user.id);
        await supabase.from("dash_pending_actions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("status", "pending");
      } catch {}
    }
    setMessages([]);
    setError(null);
    setSessionId(generateSessionId());
  }, [user, sessionId]);

  const loadSession = useCallback((newSessionId: string, msgs: DashMessage[]) => {
    setSessionId(newSessionId);
    setMessages(msgs);
    setError(null);
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const retryLast = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.content.startsWith("⚠️")) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setTimeout(() => sendMessage(lastUserMsg.content, lastUserMsg.attachments), 50);
  }, [messages, sendMessage]);

  return { messages, isLoading, error, sendMessage, sendDirectApproval, clearChat, cancelStream, sessionId, loadSession, retryLast };
}
