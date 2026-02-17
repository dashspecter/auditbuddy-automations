import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, Search, Filter, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, User, Clock
} from "lucide-react";
import { format } from "date-fns";

const TABLE_LABELS: Record<string, string> = {
  shifts: "Shifts",
  schedule_periods: "Schedule Periods",
  schedule_change_requests: "Change Requests",
  employees: "Employees",
  attendance_logs: "Attendance",
  time_off_requests: "Time Off",
  company_users: "Company Users",
  workforce_policies: "Workforce Policies",
  workforce_exceptions: "Workforce Exceptions",
  location_audits: "Audits",
  tasks: "Tasks",
  locations: "Locations",
  inventory_items: "Inventory",
  waste_entries: "Waste",
  equipment: "Equipment",
  cmms_work_orders: "Work Orders",
  company_role_permissions: "Permissions",
};

const ACTION_CONFIG = {
  INSERT: { icon: Plus, label: "Created", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  UPDATE: { icon: Pencil, label: "Updated", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  DELETE: { icon: Trash2, label: "Deleted", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

const PAGE_SIZE = 50;

interface AuditLogEntry {
  id: string;
  company_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  description: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
}

const ActivityLog = () => {
  const { data: company } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-audit-log', company?.id, tableFilter, actionFilter, searchQuery, page],
    queryFn: async () => {
      if (!company?.id) return { entries: [], count: 0 };

      let query = supabase
        .from('platform_audit_log')
        .select('*', { count: 'exact' })
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tableFilter !== "all") {
        query = query.eq('table_name', tableFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq('action', actionFilter);
      }
      if (searchQuery.trim()) {
        query = query.or(`user_email.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: entries, error, count } = await query;
      if (error) throw error;
      return { entries: (entries || []) as AuditLogEntry[], count: count || 0 };
    },
    enabled: !!company?.id,
  });

  const entries = data?.entries || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getChangedFields = (oldData: Record<string, any> | null, newData: Record<string, any> | null): string[] => {
    if (!oldData || !newData) return [];
    const changed: string[] = [];
    for (const key of Object.keys(newData)) {
      if (key === 'updated_at' || key === 'created_at') continue;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changed.push(key);
      }
    }
    return changed;
  };

  const formatFieldName = (field: string): string => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const buildDescription = (entry: AuditLogEntry): string => {
    const tableLabel = TABLE_LABELS[entry.table_name] || entry.table_name;
    const actionLabel = ACTION_CONFIG[entry.action as keyof typeof ACTION_CONFIG]?.label || entry.action;
    
    if (entry.action === 'UPDATE') {
      const changed = getChangedFields(entry.old_data, entry.new_data);
      if (changed.length > 0 && changed.length <= 3) {
        return `${actionLabel} ${tableLabel}: ${changed.map(formatFieldName).join(', ')}`;
      }
      if (changed.length > 3) {
        return `${actionLabel} ${tableLabel}: ${changed.slice(0, 3).map(formatFieldName).join(', ')} +${changed.length - 3} more`;
      }
    }

    // For shifts, show role + date if available
    if (entry.table_name === 'shifts') {
      const data = entry.new_data || entry.old_data;
      if (data) {
        const parts: string[] = [];
        if (data.role) parts.push(data.role);
        if (data.shift_date) parts.push(format(new Date(data.shift_date), 'MMM d'));
        if (parts.length > 0) return `${actionLabel} Shift: ${parts.join(' • ')}`;
      }
    }

    // For schedule_periods, show state
    if (entry.table_name === 'schedule_periods' && entry.new_data?.state) {
      return `${actionLabel} Schedule Period → ${entry.new_data.state}`;
    }

    // For employees
    if (entry.table_name === 'employees') {
      const data = entry.new_data || entry.old_data;
      if (data?.full_name) return `${actionLabel} Employee: ${data.full_name}`;
    }

    return `${actionLabel} ${tableLabel}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Track all changes made across the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or description..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Changes</CardTitle>
              <CardDescription>
                {totalCount} total entries
                {tableFilter !== "all" && ` in ${TABLE_LABELS[tableFilter] || tableFilter}`}
              </CardDescription>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading activity log...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity logged yet</p>
              <p className="text-sm mt-1">Changes will appear here as they happen</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {entries.map((entry) => {
                  const config = ACTION_CONFIG[entry.action as keyof typeof ACTION_CONFIG] || ACTION_CONFIG.UPDATE;
                  const ActionIcon = config.icon;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`p-1.5 rounded-full ${config.bg} mt-0.5`}>
                        <ActionIcon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {buildDescription(entry)}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.user_email || 'System'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {TABLE_LABELS[entry.table_name] || entry.table_name}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
