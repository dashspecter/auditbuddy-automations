import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  Trophy,
  XCircle,
  Timer
} from "lucide-react";

interface KioskDashboardProps {
  locationId: string;
  companyId: string;
}

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface AttendanceLog {
  id: string;
  staff_id: string;
  check_in_at: string;
  check_out_at: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
  priority: string;
}

export const KioskDashboard = ({ locationId, companyId }: KioskDashboardProps) => {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

  // Fetch employees at this location
  const { data: employees = [] } = useQuery({
    queryKey: ["kiosk-employees", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, avatar_url, role")
        .eq("location_id", locationId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data as Employee[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch today's attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ["kiosk-attendance", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id, staff_id, check_in_at, check_out_at")
        .eq("location_id", locationId)
        .gte("check_in_at", todayStart)
        .lte("check_in_at", todayEnd);
      if (error) throw error;
      return data as AttendanceLog[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch today's tasks for this location
  const { data: tasks = [] } = useQuery({
    queryKey: ["kiosk-tasks", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      // First get task IDs for this location
      const { data: taskLocations, error: tlError } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);

      if (tlError) throw tlError;
      if (!taskLocations?.length) return [];

      const taskIds = taskLocations.map((tl) => tl.task_id);

      // Then get the tasks
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, assigned_to, priority")
        .in("id", taskIds)
        .gte("due_date", format(today, "yyyy-MM-dd"))
        .lte("due_date", format(today, "yyyy-MM-dd"));

      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 30000,
  });

  // Fetch weekly task completion stats for leaderboard
  const { data: weeklyStats = [] } = useQuery({
    queryKey: ["kiosk-leaderboard", locationId, format(today, "yyyy-ww")],
    queryFn: async () => {
      // Get completed tasks this week for employees at this location
      const { data: taskLocations, error: tlError } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);

      if (tlError) throw tlError;
      if (!taskLocations?.length) return [];

      const taskIds = taskLocations.map((tl) => tl.task_id);

      const { data, error } = await supabase
        .from("tasks")
        .select("assigned_to, status, completed_at")
        .in("id", taskIds)
        .eq("status", "completed")
        .gte("completed_at", weekStart)
        .lte("completed_at", weekEnd);

      if (error) throw error;

      // Aggregate by employee
      const stats: Record<string, number> = {};
      (data || []).forEach((task) => {
        if (task.assigned_to) {
          stats[task.assigned_to] = (stats[task.assigned_to] || 0) + 1;
        }
      });

      // Convert to array and sort
      return Object.entries(stats)
        .map(([employeeId, count]) => ({ employeeId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  // Get today's task completion stats
  const { data: dailyStats = [] } = useQuery({
    queryKey: ["kiosk-daily-stats", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data: taskLocations, error: tlError } = await supabase
        .from("task_locations")
        .select("task_id")
        .eq("location_id", locationId);

      if (tlError) throw tlError;
      if (!taskLocations?.length) return [];

      const taskIds = taskLocations.map((tl) => tl.task_id);

      const { data, error } = await supabase
        .from("tasks")
        .select("assigned_to, status, completed_at")
        .in("id", taskIds)
        .eq("status", "completed")
        .gte("completed_at", todayStart)
        .lte("completed_at", todayEnd);

      if (error) throw error;

      const stats: Record<string, number> = {};
      (data || []).forEach((task) => {
        if (task.assigned_to) {
          stats[task.assigned_to] = (stats[task.assigned_to] || 0) + 1;
        }
      });

      return Object.entries(stats)
        .map(([employeeId, count]) => ({ employeeId, count }))
        .sort((a, b) => b.count - a.count);
    },
    refetchInterval: 30000,
  });

  // Create a map for quick employee lookup
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // Create attendance status map
  const attendanceMap = new Map<string, { checkedIn: boolean; checkedOut: boolean }>();
  attendance.forEach((log) => {
    attendanceMap.set(log.staff_id, {
      checkedIn: true,
      checkedOut: !!log.check_out_at,
    });
  });

  const getEmployeeName = (id: string) => employeeMap.get(id)?.full_name || "Unknown";

  const checkedInCount = employees.filter((e) => {
    const status = attendanceMap.get(e.id);
    return status?.checkedIn && !status?.checkedOut;
  }).length;

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const pendingTasksCount = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
              <div className="text-xs text-muted-foreground">Clocked In</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{completedTasksCount}</div>
              <div className="text-xs text-muted-foreground">Done Today</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-orange-500/10 border-orange-500/20">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{pendingTasksCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Left Column: Staff & Tasks */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Staff List */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Today's Team ({employees.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {employees.map((employee) => {
                  const status = attendanceMap.get(employee.id);
                  const isIn = status?.checkedIn && !status?.checkedOut;
                  const isOut = status?.checkedOut;

                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {employee.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{employee.full_name}</div>
                          <div className="text-xs text-muted-foreground">{employee.role}</div>
                        </div>
                      </div>
                      {isIn ? (
                        <Badge variant="default" className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          In
                        </Badge>
                      ) : isOut ? (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Out
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Not In
                        </Badge>
                      )}
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No staff assigned to this location
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Tasks List */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Today's Tasks ({tasks.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {tasks.map((task) => {
                  const assignee = task.assigned_to ? employeeMap.get(task.assigned_to) : null;
                  const isComplete = task.status === "completed";

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isComplete ? "bg-green-500/10" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className={`text-sm truncate ${isComplete ? "line-through text-muted-foreground" : "font-medium"}`}>
                            {task.title}
                          </div>
                          {assignee && (
                            <div className="text-xs text-muted-foreground">
                              {assignee.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.priority === "high"
                            ? "destructive"
                            : task.priority === "medium"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No tasks scheduled for today
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Daily Leaderboard */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Today's Champions
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {dailyStats.map((stat, index) => {
                  const employee = employeeMap.get(stat.employeeId);
                  if (!employee) return null;

                  return (
                    <div
                      key={stat.employeeId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500 text-yellow-950"
                            : index === 1
                            ? "bg-gray-300 text-gray-700"
                            : index === 2
                            ? "bg-orange-400 text-orange-950"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{employee.full_name}</div>
                      </div>
                      <div className="text-lg font-bold text-primary">{stat.count}</div>
                    </div>
                  );
                })}
                {dailyStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    Complete tasks to appear here!
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Weekly Leaderboard */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-500" />
                Weekly Stars
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {weeklyStats.map((stat, index) => {
                  const employee = employeeMap.get(stat.employeeId);
                  if (!employee) return null;

                  return (
                    <div
                      key={stat.employeeId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-purple-500 text-white"
                            : index === 1
                            ? "bg-purple-300 text-purple-800"
                            : index === 2
                            ? "bg-purple-200 text-purple-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{employee.full_name}</div>
                      </div>
                      <div className="text-lg font-bold text-purple-600">{stat.count}</div>
                    </div>
                  );
                })}
                {weeklyStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    No completions this week yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KioskDashboard;
