import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface MyCorrectiveActionsCardProps {
  /** The Supabase auth user_id (not employee_id) */
  userId: string;
}

/**
 * Shows open corrective action items assigned to this employee on their mobile home screen.
 * Only renders when there are open items — otherwise returns null (no empty state noise).
 */
export const MyCorrectiveActionsCard = ({ userId }: MyCorrectiveActionsCardProps) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my_ca_items", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corrective_action_items")
        .select(`
          id,
          title,
          instructions,
          due_at,
          status,
          corrective_action_id,
          corrective_actions (
            title,
            severity,
            source_type
          )
        `)
        .eq("assignee_user_id", userId)
        .in("status", ["open", "in_progress"])
        .order("due_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  if (isLoading || items.length === 0) return null;

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card className="p-4 border-destructive/40 bg-destructive/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Action Required</h3>
        <Badge variant="destructive" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => {
          const overdue = isPast(new Date(item.due_at));
          const ca = item.corrective_actions;

          return (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 p-3 bg-background rounded-lg border"
            >
              {/* Parent CA context */}
              {ca && (
                <div className="flex items-center gap-2">
                  <Badge variant={severityColor(ca.severity)} className="text-xs capitalize">
                    {ca.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{ca.title}</span>
                </div>
              )}

              {/* Action item title */}
              <p className="font-medium text-sm">{item.title}</p>

              {/* Instructions if any */}
              {item.instructions && (
                <p className="text-xs text-muted-foreground line-clamp-2">{item.instructions}</p>
              )}

              {/* Due date */}
              <div className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                <Clock className="h-3 w-3" />
                {overdue ? "Overdue — " : "Due "}
                {format(new Date(item.due_at), "MMM d, yyyy 'at' HH:mm")}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Contact your manager once you've completed these actions.
      </p>
    </Card>
  );
};
