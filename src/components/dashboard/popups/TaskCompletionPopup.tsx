import { useTaskStats, useTasks, Task } from "@/hooks/useTasks";
import { Clock, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { isTaskOverdue, getTaskDeadline } from "@/lib/taskOccurrenceEngine";
import { useTranslation } from "react-i18next";

export const TaskCompletionPopup = () => {
  const { t } = useTranslation();
  const { data: stats } = useTaskStats();
  const { data: tasks } = useTasks({ status: "pending" });

  const urgentTasks = tasks
    ?.sort((a, b) => {
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      const aD = getTaskDeadline(a);
      const bD = getTaskDeadline(b);
      if (aD && bD) return aD.getTime() - bD.getTime();
      return 0;
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t("common.pending", "Pending"), value: stats?.pending || 0, cls: "bg-muted/50" },
          { label: t("common.overdue", "Overdue"), value: stats?.overdue || 0, cls: "bg-destructive/10 text-destructive" },
          { label: t("common.completed", "Done"), value: stats?.completed || 0, cls: "bg-primary/10 text-primary" },
          { label: t("common.total", "Total"), value: stats?.total || 0, cls: "bg-muted/50" },
        ].map((s) => (
          <div key={s.label} className={`text-center p-2 rounded-md ${s.cls}`}>
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent Tasks */}
      {urgentTasks && urgentTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("dashboard.popup.urgentTasks", "Most Urgent")}
          </p>
          {urgentTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            return (
              <div
                key={task.id}
                className={`p-2 rounded-md border ${overdue ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                  <Badge variant={task.priority === "high" ? "destructive" : "secondary"} className="text-xs shrink-0">
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {task.due_at && (
                    <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" />
                      {format(new Date(task.due_at), "MMM d")}
                    </span>
                  )}
                  {task.assigned_employee?.full_name && (
                    <span className="text-xs text-muted-foreground truncate">{task.assigned_employee.full_name}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
