import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffNav } from "@/components/staff/StaffNav";
import { MessageSquare, Send, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const StaffMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadMessages();
  }, [user]);

  const loadMessages = async () => {
    try {
      // Placeholder - would integrate with actual messaging system
      setMessages([
        {
          id: 1,
          from: "Manager",
          message: "Don't forget to clock in before your shift",
          time: "10:30 AM",
          unread: true
        },
        {
          id: 2,
          from: "Team Chat",
          message: "New schedule posted for next week",
          time: "Yesterday",
          unread: false
        }
      ]);
    } catch (error) {
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search messages..." />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
          </Card>
        ) : (
          messages.map((msg) => (
            <Card 
              key={msg.id} 
              className={`p-4 cursor-pointer hover:bg-accent/5 transition-colors ${
                msg.unread ? "border-primary" : ""
              }`}
            >
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
                  <span className="text-sm font-semibold">{msg.from.charAt(0)}</span>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-sm">{msg.from}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-24 right-4">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <StaffNav />
    </div>
  );
};

export default StaffMessages;
