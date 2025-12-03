import { useState, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ListTodo, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "@/hooks/useTasks";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";
import { format } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const TasksCalendar = () => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: employees = [] } = useEmployees();
  const { data: roles = [] } = useEmployeeRoles();

  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Get unique roles from employees
  const employeeRoles = useMemo(() => {
    const roleSet = new Set(employees.map((e) => e.role).filter(Boolean));
    return Array.from(roleSet);
  }, [employees]);

  // Filter tasks based on employee and role
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filterEmployee !== "all") {
      filtered = filtered.filter((t) => t.assigned_to === filterEmployee);
    }

    if (filterRole !== "all") {
      // Find employees with this role
      const employeesInRole = employees
        .filter((e) => e.role === filterRole)
        .map((e) => e.id);
      
      // Find the role ID from employee_roles that matches the name
      const matchingRole = roles.find((r) => r.name === filterRole);
      
      // Filter tasks assigned to employees with this role OR directly assigned to this role
      filtered = filtered.filter((t) => 
        (t.assigned_to && employeesInRole.includes(t.assigned_to)) ||
        (matchingRole && t.assigned_role_id === matchingRole.id)
      );
    }

    return filtered;
  }, [tasks, filterEmployee, filterRole, employees, roles]);

  // Helper to generate recurring occurrences
  const generateOccurrences = (task: any, rangeStart: Date, rangeEnd: Date) => {
    const occurrences: any[] = [];
    const startDate = new Date(task.start_at || task.due_at!);
    const duration = task.duration_minutes || 0;
    const recurrenceEnd = task.recurrence_end_date ? new Date(task.recurrence_end_date) : rangeEnd;
    const interval = task.recurrence_interval || 1;

    let currentDate = new Date(startDate);

    while (currentDate <= rangeEnd && currentDate <= recurrenceEnd) {
      if (currentDate >= rangeStart || currentDate.toDateString() === startDate.toDateString()) {
        const endDate = duration > 0
          ? new Date(currentDate.getTime() + duration * 60000)
          : new Date(currentDate);
        
        occurrences.push({
          id: `${task.id}-${currentDate.toISOString()}`,
          title: task.title,
          start: new Date(currentDate),
          end: endDate,
          allDay: !task.start_at,
          resource: task,
        });
      }

      // Move to next occurrence
      switch (task.recurrence_type) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7 * interval);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        default:
          return occurrences;
      }
    }

    return occurrences;
  };

  // Convert tasks to calendar events (expand recurring tasks)
  const events = useMemo(() => {
    // Define visible range (show 3 months forward for recurring tasks)
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 1);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 3);

    const allEvents: any[] = [];

    filteredTasks.forEach((task) => {
      if (!task.start_at && !task.due_at) return;

      const isRecurring = task.recurrence_type && task.recurrence_type !== "none";

      if (isRecurring) {
        // Generate all occurrences for recurring tasks
        const occurrences = generateOccurrences(task, rangeStart, rangeEnd);
        allEvents.push(...occurrences);
      } else {
        // Single occurrence task
        const startDate = new Date(task.start_at || task.due_at!);
        const endDate = task.start_at && task.duration_minutes
          ? new Date(startDate.getTime() + task.duration_minutes * 60000)
          : startDate;
        
        allEvents.push({
          id: task.id,
          title: task.title,
          start: startDate,
          end: endDate,
          allDay: !task.start_at,
          resource: task,
        });
      }
    });

    return allEvents;
  }, [filteredTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const eventStyleGetter = (event: any) => {
    const task = event.resource;
    const isCompleted = task.status === "completed";
    const deadline = task.start_at && task.duration_minutes 
      ? new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60000)
      : task.due_at ? new Date(task.due_at) : null;
    const isOverdue = !isCompleted && deadline && deadline < new Date();

    let backgroundColor = "hsl(var(--primary))";
    if (isCompleted) {
      backgroundColor = "hsl(142, 76%, 36%)"; // green
    } else if (isOverdue) {
      backgroundColor = "hsl(0, 84%, 60%)"; // red
    } else if (task.priority === "urgent") {
      backgroundColor = "hsl(0, 84%, 60%)";
    } else if (task.priority === "high") {
      backgroundColor = "hsl(25, 95%, 53%)"; // orange
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: isCompleted ? 0.6 : 1,
        color: "white",
        border: "none",
        fontSize: "12px",
        padding: "2px 4px",
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    // Could open a task detail modal here
    console.log("Selected task:", event.resource);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tasks")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tasks Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View tasks by date, employee, or role
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/tasks")}>
            <ListTodo className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button onClick={() => navigate("/tasks/new")}>
            + New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2 min-w-[200px]">
              <label className="text-sm font-medium">Filter by Employee</label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 min-w-[200px]">
              <label className="text-sm font-medium">Filter by Role</label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {employeeRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterEmployee("all");
                  setFilterRole("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Overdue / Urgent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span>High Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600 opacity-60" />
          <span>Completed</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              views={["month", "week", "day"]}
              defaultView="month"
              popup
              tooltipAccessor={(event) => {
                const task = event.resource;
                return `${task.title}\nPriority: ${task.priority}\nStatus: ${task.status}${
                  task.assigned_employee
                    ? `\nAssigned to: ${task.assigned_employee.full_name}`
                    : ""
                }`;
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredTasks.length}</div>
            <p className="text-muted-foreground text-sm">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredTasks.filter((t) => t.status === "pending").length}
            </div>
            <p className="text-muted-foreground text-sm">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {
                filteredTasks.filter((t) => {
                  if (t.status === "completed") return false;
                  const deadline = t.start_at && t.duration_minutes
                    ? new Date(new Date(t.start_at).getTime() + t.duration_minutes * 60000)
                    : t.due_at ? new Date(t.due_at) : null;
                  return deadline && deadline < new Date();
                }).length
              }
            </div>
            <p className="text-muted-foreground text-sm">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredTasks.filter((t) => t.status === "completed").length}
            </div>
            <p className="text-muted-foreground text-sm">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Tasks Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTasks
              .filter((t) => t.recurrence_type && t.recurrence_type !== "none")
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Repeats {task.recurrence_type}
                      {task.recurrence_interval && task.recurrence_interval > 1
                        ? ` every ${task.recurrence_interval} ${
                            task.recurrence_type === "daily"
                              ? "days"
                              : task.recurrence_type === "weekly"
                              ? "weeks"
                              : "months"
                          }`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.assigned_employee && (
                      <Badge variant="outline">
                        {task.assigned_employee.full_name}
                      </Badge>
                    )}
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            {filteredTasks.filter(
              (t) => t.recurrence_type && t.recurrence_type !== "none"
            ).length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No recurring tasks found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksCalendar;
