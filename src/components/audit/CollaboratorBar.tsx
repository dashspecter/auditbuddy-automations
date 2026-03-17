import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Collaborator {
  userId: string;
  initials: string;
  lastSeen: number;
}

interface CollaboratorBarProps {
  auditId: string;
}

export default function CollaboratorBar({ auditId }: CollaboratorBarProps) {
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const initials = (user.email || "U").substring(0, 2).toUpperCase();

      channel = supabase.channel(`audit-presence-${auditId}`, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState();
          const newCollabs = new Map<string, Collaborator>();
          Object.entries(state).forEach(([key, presences]) => {
            const p = presences[0] as any;
            newCollabs.set(key, {
              userId: key,
              initials: p.initials || key.substring(0, 2).toUpperCase(),
              lastSeen: Date.now(),
            });
          });
          setCollaborators(newCollabs);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel!.track({ initials, auditId });
          }
        });
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [auditId]);

  const otherCollaborators = Array.from(collaborators.values()).filter(
    (c) => c.userId !== currentUserId
  );

  if (otherCollaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Working together:</span>
      <div className="flex -space-x-2">
        {otherCollaborators.map((c) => (
          <Avatar key={c.userId} className="h-7 w-7 border-2 border-background">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {c.initials}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <Badge variant="secondary" className="text-xs">
        {otherCollaborators.length + 1} active
      </Badge>
    </div>
  );
}
