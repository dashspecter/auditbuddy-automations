import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StaffNav } from "@/components/staff/StaffNav";
import { ListTodo, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const StaffTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    try {
      // Placeholder - would integrate with actual task system
      setTasks([
        {
          id: 1,
          title: "Complete opening checklist",
          priority: "high",
          dueTime: "9:00 AM",
          completed: false
        },
        {
          id: 2,
          title: "Restock supplies",
          priority: "medium",
          dueTime: "2:00 PM",
          completed: false
        },
        {
          id: 3,
          title: "Clean equipment",
          priority: "low",
          dueTime: "End of shift",
          completed: true
        }
      ]);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    toast.success("Task updated");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "secondary";
    }
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10 pt-safe">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-3">My Tasks</h1>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {pendingTasks.length} pending
            </Badge>
            <Badge variant="outline">
              {completedTasks.length} completed
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              To Do
            </h2>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant={priorityColor(task.priority) as any} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Due: {task.dueTime}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-muted-foreground">Completed</h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card key={task.id} className="p-4 opacity-60">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium line-through">{task.title}</h3>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <Card className="p-8 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No tasks assigned</p>
          </Card>
        )}
      </div>

      <StaffNav />
    </div>
  );
};

export default StaffTasks;
