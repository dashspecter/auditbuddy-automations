import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes, differenceInSeconds, isPast } from "date-fns";
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
  Timer,
  AlertTriangle
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

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  shift_assignments: { staff_id: string }[];
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
  start_at: string | null;
  due_at: string | null;
  role_ids?: string[];
  role_names?: string[];
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

  // Fetch today's shifts at this location
  const { data: shifts = [] } = useQuery({
    queryKey: ["kiosk-shifts", locationId, format(today, "yyyy-MM-dd")],
    queryFn: async (): Promise<Shift[]> => {
      const todayStr = format(today, "yyyy-MM-dd");
      
      // Get shifts for this location and date
      const { data: shiftsList, error: shiftsError } = await (supabase
        .from("shifts") as any)
        .select("id, start_time, end_time")
        .eq("location_id", locationId)
        .eq("shift_date", todayStr);
      if (shiftsError) throw shiftsError;
      if (!shiftsList?.length) return [];
      
      // Get assignments for those shifts
      const shiftIds = shiftsList.map((s: any) => s.id);
      const { data: assignments, error: assignError } = await (supabase
        .from("shift_assignments") as any)
        .select("shift_id, staff_id")
        .in("shift_id", shiftIds);
      if (assignError) throw assignError;
      
      // Combine
      return shiftsList.map((shift: any) => ({
        ...shift,
        shift_assignments: (assignments || []).filter((a: any) => a.shift_id === shift.id)
      }));
    },
    refetchInterval: 60000,
  });

  // Fetch today's tasks for this location (including future tasks) with their assigned roles
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

      // Get all non-completed tasks for today and overdue tasks
      const { data, error } = await (supabase
        .from("tasks") as any)
        .select("id, title, status, assigned_to, priority, start_at, due_at")
        .in("id", taskIds)
        .or(`and(start_at.gte.${todayStart},start_at.lte.${todayEnd}),and(due_at.lt.${new Date().toISOString()},status.neq.completed)`);

      if (error) throw error;
      if (!data?.length) return [];

      // Get role assignments for these tasks
      const { data: taskRoles, error: trError } = await supabase
        .from("task_roles")
        .select("task_id, role_id")
        .in("task_id", data.map((t: any) => t.id));

      if (trError) throw trError;

      // Get role names
      const roleIds = [...new Set((taskRoles || []).map((tr: any) => tr.role_id))];
      let roleMap: Record<string, string> = {};
      
      if (roleIds.length > 0) {
        const { data: roles, error: rolesError } = await supabase
          .from("employee_roles")
          .select("id, name")
          .in("id", roleIds);
        
        if (!rolesError && roles) {
          roleMap = Object.fromEntries(roles.map((r: any) => [r.id, r.name]));
        }
      }

      // Attach role info to tasks
      return data.map((task: any) => {
        const taskRoleEntries = (taskRoles || []).filter((tr: any) => tr.task_id === task.id);
        return {
          ...task,
          role_ids: taskRoleEntries.map((tr: any) => tr.role_id),
          role_names: taskRoleEntries.map((tr: any) => roleMap[tr.role_id]).filter(Boolean)
        };
      }) as Task[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds for countdown accuracy
  });

  // Countdown timer state
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Create shift map for employees
  const employeeShiftMap = new Map<string, { start: string; end: string }>();
  shifts.forEach((shift) => {
    shift.shift_assignments?.forEach((assignment) => {
      employeeShiftMap.set(assignment.staff_id, {
        start: shift.start_time,
        end: shift.end_time,
      });
    });
  });

  // Filter employees to only those with shifts today
  const todaysTeam = employees.filter((e) => employeeShiftMap.has(e.id));

  const getEmployeeName = (id: string) => employeeMap.get(id)?.full_name || "Unknown";

  const checkedInCount = todaysTeam.filter((e) => {
    const status = attendanceMap.get(e.id);
    return status?.checkedIn && !status?.checkedOut;
  }).length;

  // Group tasks by their assigned roles and find employees on shift with those roles
  const tasksByRole = useMemo(() => {
    const roleGroups: Record<string, { 
      tasks: Task[];
      employees: Employee[];
    }> = {};

    // Get all pending/in-progress tasks
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    
    // Group tasks by their assigned role names
    pendingTasks.forEach(task => {
      const roleNames = task.role_names || [];
      
      if (roleNames.length === 0) {
        // Unassigned to any role - put in "Unassigned" group
        if (!roleGroups["Unassigned"]) {
          roleGroups["Unassigned"] = { tasks: [], employees: [] };
        }
        roleGroups["Unassigned"].tasks.push(task);
      } else {
        // Add task to each of its assigned roles
        roleNames.forEach(roleName => {
          if (!roleGroups[roleName]) {
            roleGroups[roleName] = { tasks: [], employees: [] };
          }
          roleGroups[roleName].tasks.push(task);
        });
      }
    });

    // For each role group, find employees on shift today with that role
    Object.keys(roleGroups).forEach(roleName => {
      if (roleName !== "Unassigned") {
        roleGroups[roleName].employees = todaysTeam.filter(e => e.role === roleName);
      }
    });

    // Sort tasks within each group by start_at
    Object.values(roleGroups).forEach(group => {
      group.tasks.sort((a, b) => {
        const timeA = a.start_at || a.due_at || "";
        const timeB = b.start_at || b.due_at || "";
        return timeA.localeCompare(timeB);
      });
    });

    // Sort roles alphabetically, but put "Unassigned" last
    return Object.entries(roleGroups)
      .sort(([a], [b]) => {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return a.localeCompare(b);
      });
  }, [tasks, todaysTeam, now]);

  // Format countdown
  const formatCountdown = (targetDate: string) => {
    const target = new Date(targetDate);
    const diffMins = differenceInMinutes(target, now);
    const diffSecs = differenceInSeconds(target, now) % 60;

    if (diffMins < 0) return "Overdue";
    if (diffMins === 0) return `${diffSecs}s`;
    if (diffMins < 60) return `${diffMins}m ${Math.abs(diffSecs)}s`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const pendingTasksCount = tasks.filter((t) => t.status !== "completed").length;
  const overdueTasksCount = tasks.filter((t) => 
    t.status !== "completed" && t.due_at && isPast(new Date(t.due_at))
  ).length;

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
                Today's Team ({todaysTeam.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-1">
                {todaysTeam.map((employee) => {
                  const status = attendanceMap.get(employee.id);
                  const isIn = status?.checkedIn && !status?.checkedOut;
                  const isOut = status?.checkedOut;
                    const employeeShift = employeeShiftMap.get(employee.id);

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
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{employee.role}</span>
                              {employeeShift && (
                                <>
                                  <span className="text-muted-foreground/50">•</span>
                                  <span className="text-primary/80">
                                    {employeeShift.start.slice(0, 5)} - {employeeShift.end.slice(0, 5)}
                                  </span>
                                </>
                              )}
                            </div>
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
                {todaysTeam.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No shifts scheduled for today
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Enhanced Tasks List - Grouped by Role */}
          <Card className="flex-1 overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Today's Tasks ({pendingTasksCount})
                {overdueTasksCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {overdueTasksCount} Overdue
                  </Badge>
                )}
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="p-2 space-y-3">
                {tasksByRole.map(([role, { tasks: roleTasks, employees: roleEmployees }]) => (
                  <div key={role} className="space-y-1">
                    {/* Role Header */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${role === "Unassigned" ? "bg-muted-foreground" : "bg-primary"}`} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {role}
                      </span>
                      {roleEmployees.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ({roleEmployees.map(e => e.full_name.split(' ')[0]).join(', ')})
                        </span>
                      )}
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Tasks for this role */}
                    {roleTasks.map((task) => {
                      const isOverdue = task.due_at && isPast(new Date(task.due_at));
                      return (
                        <div
                          key={task.id}
                          className="rounded-lg bg-muted/30 p-2 flex items-center gap-2"
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          ) : (
                            <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                          <span className={`text-sm truncate flex-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                            {task.title}
                          </span>
                          {isOverdue ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              OVERDUE
                            </Badge>
                          ) : task.start_at ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {formatCountdown(task.start_at)}
                            </Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {tasksByRole.length === 0 && (
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
