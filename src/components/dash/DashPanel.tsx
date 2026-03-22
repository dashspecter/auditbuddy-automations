import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Trash2, Maximize2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashChat } from "@/hooks/useDashChat";
import { DashMessageList } from "./DashMessageList";
import { DashInput } from "./DashInput";
import { DashScopeBar } from "./DashScopeBar";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface DashPanelProps {
  trigger?: React.ReactNode;
}

const SUGGESTED_BY_ROLE: Record<string, string[]> = {
  admin: [
    "What are the biggest operational issues across all locations this month?",
    "Show me open corrective actions by severity",
    "Compare audit scores between locations this month",
    "Are there any expiring documents I should know about?",
  ],
  manager: [
    "Give me a summary of today's attendance exceptions",
    "What are the top issues in my locations this week?",
    "Show open corrective actions that are overdue",
    "How are my locations performing on audits this month?",
  ],
  staff: [
    "What tasks are pending at my location?",
    "Show me recent audit results",
    "Are there any open work orders?",
    "What training is overdue?",
  ],
};

export function DashPanel({ trigger }: DashPanelProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();
  const [open, setOpen] = useState(false);
  const { messages, isLoading, sendMessage, clearChat, cancelStream } = useDashChat();

  const role = roleData?.isAdmin ? "admin" : roleData?.isManager ? "manager" : "staff";
  const suggested = SUGGESTED_BY_ROLE[role] || SUGGESTED_BY_ROLE.staff;

  const chatContent = (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between">
        <DashScopeBar />
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat} title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isMobile && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setOpen(false); navigate("/dash"); }} title="Full workspace">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <DashMessageList messages={messages} isLoading={isLoading} suggestedQuestions={suggested} onSuggestedClick={sendMessage} />
      <DashInput onSend={sendMessage} isLoading={isLoading} onCancel={cancelStream} />
    </div>
  );

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Bot className="h-4 w-4" />
      <span>Dash</span>
    </Button>
  );

  const triggerEl = trigger || defaultTrigger;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerEl}</SheetTrigger>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-2xl flex flex-col">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <div className="p-1 rounded-lg bg-primary/15">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              Dash Command Center
            </SheetTitle>
          </SheetHeader>
          {chatContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerEl}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px] h-[680px] flex flex-col p-5">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="p-1 rounded-lg bg-primary/15">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            Dash Command Center
          </DialogTitle>
        </DialogHeader>
        {chatContent}
      </DialogContent>
    </Dialog>
  );
}
