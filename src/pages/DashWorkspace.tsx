import { Bot, ArrowLeft, Download, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashChat } from "@/hooks/useDashChat";
import { DashMessageList } from "@/components/dash/DashMessageList";
import { DashInput } from "@/components/dash/DashInput";
import { DashScopeBar } from "@/components/dash/DashScopeBar";
import { DashSessionHistory } from "@/components/dash/DashSessionHistory";
import { DashSavedWorkflows } from "@/components/dash/DashSavedWorkflows";
import { Trash2 } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
  const { messages, displayMessages, hasMoreHistory, loadMoreHistory, isLoading, sendMessage, sendDirectApproval, clearChat, cancelStream, sessionId, loadSession, retryLast } = useDashChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSend = (text: string, attachments?: import("@/components/dash/DashInput").DashAttachment[]) => {
    sendMessage(text, attachments);
  };

  const handleExport = useCallback(() => {
    exportConversation(messages.map(m => ({ role: m.role, content: m.content })));
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-border/40 mb-3 shrink-0">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="gap-1.5 text-xs hidden lg:inline-flex"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
            {sidebarOpen ? "Hide" : "History"}
          </Button>
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

      {/* Desktop: optional side rail + main chat | Mobile: chat only */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Side rail — hidden by default, toggle on lg+ */}
        <aside
          className={cn(
            "hidden lg:flex flex-col w-64 shrink-0 space-y-4 overflow-y-auto pr-2 transition-all duration-200",
            !sidebarOpen && "lg:hidden"
          )}
        >
          <DashSessionHistory
            currentSessionId={sessionId}
            onSelectSession={(sid, msgs) => loadSession(sid, msgs)}
            onNewSession={clearChat}
          />
          <DashSavedWorkflows onRunWorkflow={(prompt) => handleSend(prompt)} />
        </aside>

        {/* Main chat column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat area */}
          <DashMessageList messages={displayMessages} isLoading={isLoading} suggestedQuestions={SUGGESTED} onSuggestedClick={(q) => handleSend(q)} onRetry={retryLast} onDirectApproval={sendDirectApproval} hasMoreHistory={hasMoreHistory} loadMoreHistory={loadMoreHistory} />

          {/* Input */}
          <div className="pt-3 border-t border-border/40 mt-auto shrink-0">
            <DashInput onSend={handleSend} isLoading={isLoading} onCancel={cancelStream} placeholder="Ask Dash about your operations..." />
          </div>
        </div>
      </div>
    </div>
  );
}
