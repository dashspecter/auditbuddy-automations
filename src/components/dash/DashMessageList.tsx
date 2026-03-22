import { useRef, useEffect, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashMessage, DashStructuredEvent } from "@/hooks/useDashChat";
import ReactMarkdown from "react-markdown";
import { SourceCard } from "./SourceCard";
import { DataTableCard } from "./DataTableCard";
import { ClarificationCard } from "./ClarificationCard";
import { ActionPreviewCard } from "./ActionPreviewCard";
import { ExecutionResultCard } from "./ExecutionResultCard";

interface DashMessageListProps {
  messages: DashMessage[];
  isLoading: boolean;
  suggestedQuestions: string[];
  onSuggestedClick: (q: string) => void;
}

function StructuredEventRenderer({ event, onSuggestedClick }: { event: DashStructuredEvent; onSuggestedClick: (q: string) => void }) {
  switch (event.type) {
    case "source_card":
      return <SourceCard module={event.data.module} entity={event.data.entity} id={event.data.id} label={event.data.label} />;
    case "data_table":
      return <DataTableCard columns={event.data.columns} rows={event.data.rows} title={event.data.title} />;
    case "clarification":
      return <ClarificationCard question={event.data.question} options={event.data.options} onSelect={(answer) => onSuggestedClick(answer)} />;
    case "action_preview":
      return <ActionPreviewCard action={event.data.action} summary={event.data.summary} risk={event.data.risk || "medium"} affected={event.data.affected} />;
    case "execution_result":
      return <ExecutionResultCard status={event.data.status} title={event.data.title} summary={event.data.summary} changes={event.data.changes} errors={event.data.errors} />;
    default:
      return null;
  }
}

const MessageBubble = memo(({ msg, onSuggestedClick }: { msg: DashMessage; onSuggestedClick: (q: string) => void }) => (
  <div
    className={cn(
      "flex gap-3 p-3 rounded-xl transition-all",
      msg.role === "user"
        ? "bg-muted/60 ml-10"
        : "bg-primary/[0.04] border border-primary/10 mr-4"
    )}
  >
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        msg.role === "user" ? "bg-muted-foreground/15" : "bg-primary/15"
      )}
    >
      {msg.role === "user" ? (
        <User className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <Bot className="h-3.5 w-3.5 text-primary" />
      )}
    </div>
    <div className="flex-1 min-w-0 space-y-2">
      {/* Structured events before text */}
      {msg.structured && msg.structured.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {msg.structured
            .filter(e => e.type === "source_card")
            .map((e, i) => <StructuredEventRenderer key={`src-${i}`} event={e} onSuggestedClick={onSuggestedClick} />)}
        </div>
      )}

      {/* Main markdown content */}
      <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-td:text-foreground prose-th:text-foreground/80 prose-th:font-semibold prose-table:text-xs">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>

      {/* Structured events after text (tables, actions, results, clarifications) */}
      {msg.structured && msg.structured.length > 0 && (
        <>
          {msg.structured
            .filter(e => e.type !== "source_card")
            .map((e, i) => <StructuredEventRenderer key={`ev-${i}`} event={e} onSuggestedClick={onSuggestedClick} />)}
        </>
      )}
    </div>
  </div>
));
MessageBubble.displayName = "MessageBubble";

export function DashMessageList({ messages, isLoading, suggestedQuestions, onSuggestedClick }: DashMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="space-y-3 pb-4 px-1">
        {messages.length === 0 ? (
          <div className="space-y-5 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15">
              <div className="p-2 rounded-lg bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Dash Command Center</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your operational intelligence layer. Ask about audits, workforce, tasks, maintenance, corrective actions, and more — across all your locations.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Try asking</p>
              <div className="grid gap-1.5">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestedClick(q)}
                    className="text-left text-sm px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/60 hover:border-primary/20 transition-all duration-150 text-foreground/80 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} onSuggestedClick={onSuggestedClick} />)
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 p-3 rounded-xl bg-primary/[0.04] border border-primary/10 mr-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analyzing...</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
