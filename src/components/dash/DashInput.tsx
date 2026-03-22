import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

export function DashInput({ onSend, isLoading, onCancel, placeholder, className }: DashInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex gap-2 items-end", className)}>
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={placeholder ?? "Ask Dash anything about your operations..."}
          rows={1}
          className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 min-h-[42px] max-h-[120px]"
          style={{ height: "auto", overflow: "hidden" }}
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 120) + "px";
          }}
        />
      </div>
      {isLoading ? (
        <Button size="icon" variant="outline" onClick={onCancel} className="h-[42px] w-[42px] shrink-0 rounded-xl">
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" onClick={handleSubmit} disabled={!input.trim()} className="h-[42px] w-[42px] shrink-0 rounded-xl">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
