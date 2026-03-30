import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
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
const STREAM_TIMEOUT_MS = 90_000; // 90 seconds without data → abort
const DISPLAY_PAGE_SIZE = 50;

/** Get a fresh access token, refreshing the session if needed */
async function getFreshToken(): Promise<string> {
  // First try getSession (cached, fast)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    // Check if token expires within 60 seconds — if so, force refresh
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt - Date.now() > 60_000) {
      return session.access_token;
    }
  }
  // Force refresh
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session?.access_token) {
    throw new Error("Session expired. Please sign in again.");
  }
  return refreshData.session.access_token;
}

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

/** Result of a direct approval call — used by ActionPreviewCard to update its state */
export type ApprovalResult = { success: boolean; error?: string };

export function useDashChat() {
  const [messages, setMessages] = useState<DashMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateSessionId);
  const abortRef = useRef<AbortController | null>(null);
  const streamStartedRef = useRef(false);
  const { user } = useAuth();
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const [extraHistory, setExtraHistory] = useState(0);

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
          // Reconcile pending action statuses so stale cards don't show Approve
          const pendingActionIds: string[] = [];
          msgs.forEach(m => m.structured?.forEach((s: any) => {
            if (s.type === "action_preview" && s.data?.pending_action_id) {
              pendingActionIds.push(s.data.pending_action_id);
            }
          }));

          let statusMap: Record<string, string> = {};
          if (pendingActionIds.length > 0) {
            try {
              const { data: paRows } = await supabase
                .from("dash_pending_actions")
                .select("id, status")
                .in("id", pendingActionIds);
              if (paRows) {
                statusMap = Object.fromEntries(paRows.map((r: any) => [r.id, r.status]));
              }
            } catch (e) {
              console.error("[Dash] Failed to reconcile pending action statuses:", e);
            }
          }

          // Update structured events with resolved status
          const reconciledMsgs = msgs.map(m => {
            if (!m.structured) return m;
            return {
              ...m,
              structured: m.structured.map((s: any) => {
                if (s.type === "action_preview" && s.data?.pending_action_id) {
                  const dbStatus = statusMap[s.data.pending_action_id];
                  if (dbStatus && dbStatus !== "pending") {
                    return { ...s, data: { ...s.data, resolved_status: dbStatus } };
                  }
                }
                return s;
              }),
            };
          });

          setSessionId(data.id);
          setMessages(reconciledMsgs);
        }
      } catch (e) {
        console.error("[Dash] Failed to load last session:", e);
      }
    };

    loadLastSession();
    return () => { cancelled = true; };
  }, [user]);

  // Realtime: sync pending action status across tabs/sessions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dash-pending-actions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dash_pending_actions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const { id, status } = payload.new;
          if (!id || !status || status === "pending") return;
          // Update structured events in messages that reference this pending_action_id
          setMessages(prev => prev.map(m => {
            if (!m.structured) return m;
            const updated = m.structured.map(s => {
              if (s.type === "action_preview" && s.data?.pending_action_id === id) {
                return { ...s, data: { ...s.data, resolved_status: status } };
              }
              return s;
            });
            if (updated === m.structured) return m;
            return { ...m, structured: updated };
          }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto-save session 5 seconds after last message change (debounced)
  useEffect(() => {
    if (!user || messages.length === 0 || isLoading) return;
    const timer = setTimeout(async () => {
      try {
        const msgsForSave = messages.map(m => ({
          role: m.role,
          content: buildTransportText(m.content, m.attachments),
          structured: m.structured?.map(s => ({ event_type: s.type, data: s.data })),
          attachments: m.attachments,
        }));
        await supabase.from("dash_sessions").upsert({
          id: sessionId,
          user_id: user.id,
          company_id: company?.id ?? "",
          messages_json: msgsForSave as any,
          status: "active",
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "id" });
      } catch (e) {
        console.error("[Dash] Auto-save failed:", e);
      }
    }, 5000); // 5s debounce — save after user stops chatting
    return () => clearTimeout(timer);
  }, [messages, isLoading, user, sessionId]);

  const displayMessages = useMemo(
    () => messages.slice(Math.max(0, messages.length - DISPLAY_PAGE_SIZE - extraHistory)),
    [messages, extraHistory]
  );
  const hasMoreHistory = messages.length > DISPLAY_PAGE_SIZE + extraHistory;
  const loadMoreHistory = useCallback(() => {
    if (messages.length <= DISPLAY_PAGE_SIZE + extraHistory) return; // guard double-click
    setExtraHistory(prev => prev + DISPLAY_PAGE_SIZE);
  }, [messages.length, extraHistory]);

  const processStream = async (resp: Response, existingStructuredEvents?: DashStructuredEvent[]) => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const structuredEvents: DashStructuredEvent[] = existingStructuredEvents ? [...existingStructuredEvents] : [];

    // Timeout watchdog: abort if no data for STREAM_TIMEOUT_MS
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn("[Dash] Stream timeout — no data for", STREAM_TIMEOUT_MS, "ms");
        try { reader.cancel("Stream timeout"); } catch {}
      }, STREAM_TIMEOUT_MS);
    };
    resetTimeout();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetTimeout();
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
              streamStartedRef.current = true;
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
              streamStartedRef.current = true;
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
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    // R2: Guard against empty response — no text and no structured events
    if (!assistantContent && structuredEvents.length === 0) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ No response received. The request may have timed out. Please try again.", timestamp: new Date() },
      ]);
    }

    return { structuredEvents, content: assistantContent };
  };

  /** Send a direct approval/rejection and return result so the ActionPreviewCard can update its state */
  const sendDirectApproval = useCallback(async (pendingActionId: string, action: "approve" | "reject", executeTool?: string): Promise<ApprovalResult> => {
    if (isLoading) return { success: false, error: "Busy" };
    setError(null);
    setIsLoading(true);
    streamStartedRef.current = false;

    try {
      let accessToken = await getFreshToken();

      const history = messages.map(m => ({ role: m.role, content: buildTransportText(m.content, m.attachments) }));

      abortRef.current = new AbortController();

      const makeRequest = async (token: string) => fetch(DASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
        signal: abortRef.current!.signal,
      });

      let resp = await makeRequest(accessToken);

      // On 401, try refreshing the session once and retry
      if (resp.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session?.access_token) {
          accessToken = refreshData.session.access_token;
          resp = await makeRequest(accessToken);
        }
      }

      if (!resp.ok || !resp.body) {
        if (resp.status === 401) throw new Error("Session expired. Please sign in again.");
        const errBody = await resp.json().catch(() => ({ error: "Connection failed" }));
        throw new Error(errBody.error || "Failed to execute approval");
      }

      const { structuredEvents } = await processStream(resp);

      // Check if the execution_result event indicates success or failure
      const execResult = structuredEvents.find(e => e.type === "execution_result");
      if (execResult?.data?.status === "error") {
        return { success: false, error: execResult.data.summary || "Execution failed" };
      }

      // Use domain-specific keys from the execution_result event if available,
      // otherwise fall back to the full set so we never miss a stale cache.
      const domainKeys: string[] = execResult?.data?.invalidate_keys?.length
        ? execResult.data.invalidate_keys
        : ["shifts", "employee-shifts-multiweek", "pending-approvals", "shift-assignments",
           "today-working-staff", "team-stats", "time-off-requests", "employees",
           "corrective-actions", "work-orders", "attendance", "tasks", "training"];
      domainKeys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));

      return { success: true };
    } catch (err: any) {
      if (err.name === "AbortError") return { success: false, error: "Cancelled" };
      console.error("Dash approval error:", err);
      setError(err.message);
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message}`, timestamp: new Date() }]);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, sessionId, queryClient]);

  const sendMessage = useCallback(async (text: string, attachments?: DashAttachment[]) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    streamStartedRef.current = false;

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
      let accessToken = await getFreshToken();

      // Build transport text with file URLs for the backend only
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: buildTransportText(m.content, m.attachments),
      }));

      abortRef.current = new AbortController();

      const makeRequest = async (token: string) => fetch(DASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history, session_id: sessionId }),
        signal: abortRef.current!.signal,
      });

      let resp = await makeRequest(accessToken);

      // On 401, try refreshing the session once and retry
      if (resp.status === 401) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session?.access_token) {
          accessToken = refreshData.session.access_token;
          resp = await makeRequest(accessToken);
        }
      }

      if (!resp.ok || !resp.body) {
        if (resp.status === 401) throw new Error("Session expired. Please sign in again.");
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
      } catch (e) {
        console.error("[Dash] Failed to clear chat session:", e);
      }
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
    // R3: If no assistant message was started, add a cancellation message
    if (!streamStartedRef.current) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "user") {
          return [...prev, { role: "assistant", content: "Request cancelled.", timestamp: new Date() }];
        }
        return prev;
      });
    }
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

  return { messages, displayMessages, hasMoreHistory, loadMoreHistory, isLoading, error, sendMessage, sendDirectApproval, clearChat, cancelStream, sessionId, loadSession, retryLast };
}
