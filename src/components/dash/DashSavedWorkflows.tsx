import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";

interface SavedWorkflow {
  id: string;
  name: string;
  description: string | null;
  workflow_json: any;
}

interface DashSavedWorkflowsProps {
  onRunWorkflow: (prompt: string) => void;
}

export function DashSavedWorkflows({ onRunWorkflow }: DashSavedWorkflowsProps) {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("dash_saved_workflows")
        .select("id, name, description, workflow_json")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!cancelled) {
        setWorkflows((data as SavedWorkflow[]) ?? []);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || workflows.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Saved Workflows</p>
      <div className="flex flex-wrap gap-1.5">
        {workflows.map((w) => (
          <Button
            key={w.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 rounded-lg"
            onClick={() => onRunWorkflow(w.workflow_json?.prompt || w.name)}
            title={w.description || w.name}
          >
            <Zap className="h-3 w-3" />
            {w.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
