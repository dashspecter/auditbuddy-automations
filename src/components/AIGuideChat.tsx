import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircleQuestion, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useAllModules } from "@/hooks/useModules";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-guide-chat`;

const SUGGESTED_QUESTIONS_BY_ROLE: Record<string, string[]> = {
  admin: [
    "How do I add a new user?",
    "How can I create an audit template?",
    "How do I view company-wide reports?",
    "How can I manage locations?",
  ],
  manager: [
    "How do I create shifts for my team?",
    "How can I approve time-off requests?",
    "How do I perform an audit?",
    "How can I check team performance?",
  ],
  checker: [
    "How do I perform an audit?",
    "How can I check equipment?",
    "Where can I see my tasks?",
    "How do I add photos to an audit?",
  ],
  staff: [
    "How do I clock in?",
    "Where can I see my schedule?",
    "How do I request time off?",
    "How can I swap a shift?",
  ],
};

interface AIGuideChatProps {
  trigger?: React.ReactNode;
}

export const AIGuideChat = ({ trigger }: AIGuideChatProps) => {
  const isMobile = useIsMobile();
  const { data: roleData } = useUserRole();
  const { data: allModules } = useAllModules();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine user's primary role
  const getUserRole = () => {
    if (roleData?.isAdmin) return "admin";
    if (roleData?.isManager) return "manager";
    if (roleData?.isChecker) return "checker";
    return "staff";
  };

  const userRole = getUserRole();
  const suggestedQuestions = SUGGESTED_QUESTIONS_BY_ROLE[userRole] || SUGGESTED_QUESTIONS_BY_ROLE.staff;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const activeModules = allModules?.filter(m => m.is_active) || [];
    const moduleNames = activeModules.map(m => m.name);
    
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        role: userRole,
        modules: moduleNames,
      }),
    });

    if (!resp.ok || !resp.body) {
      const error = await resp.json().catch(() => ({ error: "Failed to connect" }));
      throw new Error(error.error || "Failed to start stream");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

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
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case "admin": return "Administrator";
      case "manager": return "Manager";
      case "checker": return "Checker";
      default: return "Staff";
    }
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">Welcome to Dashspect AI Guide!</h3>
                  <p className="text-sm text-muted-foreground">
                    Hi {getRoleLabel()}! I'm here to help you navigate and use the platform effectively.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Suggested for you:</p>
                <div className="grid gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2 px-3"
                      onClick={() => handleSend(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 p-3 rounded-lg",
                  msg.role === "user"
                    ? "bg-muted ml-8"
                    : "bg-primary/5 border border-primary/10 mr-8"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    msg.role === "user" ? "bg-muted-foreground/20" : "bg-primary/20"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 mr-8">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Input
          placeholder="Ask about Dashspect features..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1"
          autoComplete="off"
        />
        <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  // Default trigger if none provided
  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <MessageCircleQuestion className="h-4 w-4" />
      <span>AI Guide</span>
    </Button>
  );

  const triggerElement = trigger || defaultTrigger;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerElement}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Guide
            </SheetTitle>
          </SheetHeader>
          {chatContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Dashspect AI Guide
          </DialogTitle>
        </DialogHeader>
        {chatContent}
      </DialogContent>
    </Dialog>
  );
};
