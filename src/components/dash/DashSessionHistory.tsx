import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  updated_at: string;
  status: string;
}

interface DashSessionHistoryProps {
  currentSessionId: string;
  onSelectSession: (sessionId: string, messages: any[]) => void;
  onNewSession: () => void;
}

export function DashSessionHistory({ currentSessionId, onSelectSession, onNewSession }: DashSessionHistoryProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("dash_sessions")
        .select("id, title, updated_at, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!cancelled) {
        setSessions((data as Session[]) ?? []);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  const handleSelect = async (session: Session) => {
    if (session.id === currentSessionId) return;

    const { data } = await supabase
      .from("dash_sessions")
      .select("messages_json")
      .eq("id", session.id)
      .single();

    if (data?.messages_json) {
      const msgs = (data.messages_json as any[])
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(),
        }));
      onSelectSession(session.id, msgs);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewSession} title="New conversation">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="max-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No previous conversations</p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className={cn(
                  "w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
                  s.id === currentSessionId
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/60"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.title || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
