import { Bot, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashChat } from "@/hooks/useDashChat";
import { DashMessageList } from "@/components/dash/DashMessageList";
import { DashInput } from "@/components/dash/DashInput";
import { DashScopeBar } from "@/components/dash/DashScopeBar";
import { DashSessionHistory } from "@/components/dash/DashSessionHistory";
import { DashSavedWorkflows } from "@/components/dash/DashSavedWorkflows";
import { Trash2 } from "lucide-react";
import { useCallback } from "react";

const SUGGESTED = [
  "What are the biggest operational issues across all locations in the last 30 days?",
  "Compare audit scores between all locations this month",
  "Show all open corrective actions ranked by severity",
  "Give me a weekly compliance summary",
  "What training assignments are overdue?",
  "Show attendance exceptions from this week",
];

function exportConversation(messages: { role: string; content: string }[]) {
  if (messages.length === 0) return;
  const md = messages
    .map((m) => `## ${m.role === "user" ? "You" : "Dash"}\n\n${m.content}`)
    .join("\n\n---\n\n");
  const header = `# Dash Conversation Export\n_Exported: ${new Date().toLocaleString()}_\n\n---\n\n`;
  const blob = new Blob([header + md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dash-export-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashWorkspace() {
  const navigate = useNavigate();
  const { messages, isLoading, sendMessage, clearChat, cancelStream, sessionId, loadSession, retryLast } = useDashChat();

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  const handleExport = useCallback(() => {
    exportConversation(messages.map(m => ({ role: m.role, content: m.content })));
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-border/40 mb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Dash Command Center</h1>
              <DashScopeBar />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Session history + Saved workflows */}
      <div className="space-y-2 mb-3">
        <DashSessionHistory
          currentSessionId={sessionId}
          onSelectSession={(sid, msgs) => loadSession(sid, msgs)}
          onNewSession={clearChat}
        />
        <DashSavedWorkflows onRunWorkflow={handleSend} />
      </div>

      {/* Chat area */}
      <DashMessageList messages={messages} isLoading={isLoading} suggestedQuestions={SUGGESTED} onSuggestedClick={handleSend} onRetry={retryLast} />

      {/* Input */}
      <div className="pt-3 border-t border-border/40 mt-auto">
        <DashInput onSend={handleSend} isLoading={isLoading} onCancel={cancelStream} placeholder="Ask Dash about your operations..." />
      </div>
    </div>
  );
}
