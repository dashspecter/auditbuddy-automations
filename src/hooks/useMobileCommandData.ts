import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { startOfDay, startOfWeek, subDays, format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────

export interface ClockedInEmployee {
  id: string;
  staffName: string;
  role: string;
  locationName: string;
  locationId: string;
  checkInAt: string;
}

export interface ScheduledEmployee {
  staffId: string;
  staffName: string;
  role: string;
  locationName: string;
  locationId: string;
  shiftStart: string;
  shiftEnd: string;
}

export interface ScheduledAuditItem {
  id: string;
  templateName: string;
  locationName: string;
  assignedTo: string;
  scheduledFor: string;
}

export interface CompletedAuditItem {
  id: string;
  templateName: string;
  locationName: string;
  overallScore: number | null;
  auditDate: string;
}

export interface WeeklyAuditSummaryData {
  totalCompleted: number;
  averageScore: number;
  locationsCount: number;
  negativeAudits: CompletedAuditItem[];
  openTasks: number;
  openCAs: number;
  overdueCAs: number;
  shiftsScheduled: number;
  shiftsFilled: number;
}

export interface OpenCAItem {
  id: string;
  title: string;
  locationName: string;
  severity: string;
  dueAt: string;
  isOverdue: boolean;
}

export interface MonthlyNegativeData {
  lowScoreByLocation: { locationName: string; avgScore: number; count: number }[];
  openCAList: OpenCAItem[];
  lateEmployees: { name: string; lateCount: number }[];
}

// ── Hooks ──────────────────────────────────────────────────────────

function useClockedIn(companyId: string | undefined) {
  return useQuery({
    queryKey: ['command-clocked-in', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ClockedInEmployee[]> => {
      const todayStart = startOfDay(new Date()).toISOString();

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, staff_id, check_in_at, employees!attendance_logs_staff_id_fkey(full_name, role), locations!attendance_logs_location_id_fkey(name, id)')
        .is('check_out_at', null)
        .gte('check_in_at', todayStart);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        staffName: row.employees?.full_name ?? 'Unknown',
        role: row.employees?.role ?? '',
        locationName: row.locations?.name ?? 'Unknown',
        locationId: row.locations?.id ?? '',
        checkInAt: row.check_in_at,
      }));
    },
  });
}

function useScheduledToday(companyId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['command-scheduled-today', companyId, today],
    enabled: !!companyId,
    queryFn: async (): Promise<ScheduledEmployee[]> => {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, start_time, end_time, location_id, locations(name, id), shift_assignments(staff_id, approval_status, employees(full_name, role))')
        .eq('company_id', companyId!)
        .eq('shift_date', today)
        .eq('is_published', true)
        .in('status', ['published', 'open']);

      if (error) throw error;

      const result: ScheduledEmployee[] = [];
      for (const shift of (data ?? []) as any[]) {
        const assignments = shift.shift_assignments ?? [];
        for (const a of assignments) {
          if (a.approval_status !== 'approved') continue;
          result.push({
            staffId: a.staff_id,
            staffName: a.employees?.full_name ?? 'Unknown',
            role: a.employees?.role ?? '',
            locationName: shift.locations?.name ?? 'Unknown',
            locationId: shift.locations?.id ?? '',
            shiftStart: shift.start_time,
            shiftEnd: shift.end_time,
          });
        }
      }
      return result;
    },
  });
}

function useTodayScheduledAudits(companyId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['command-scheduled-audits', companyId, today],
    enabled: !!companyId,
    queryFn: async (): Promise<ScheduledAuditItem[]> => {
      const { data, error } = await supabase
        .from('scheduled_audits')
        .select('id, scheduled_for, assigned_to, audit_templates(name), locations(name), status')
        .eq('company_id', companyId!)
        .gte('scheduled_for', `${today}T00:00:00`)
        .lte('scheduled_for', `${today}T23:59:59`)
        .in('status', ['scheduled', 'pending']);

      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((r: any) => r.assigned_to).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        profileMap = (profiles ?? []).reduce((acc: any, p: any) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {});
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        templateName: row.audit_templates?.name ?? 'Audit',
        locationName: row.locations?.name ?? 'Unknown',
        assignedTo: profileMap[row.assigned_to] ?? 'Unassigned',
        scheduledFor: row.scheduled_for,
      }));
    },
  });
}

function useTodayCompletedAudits(companyId: string | undefined) {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['command-completed-audits', companyId, today],
    enabled: !!companyId,
    queryFn: async (): Promise<CompletedAuditItem[]> => {
      const { data, error } = await supabase
        .from('location_audits')
        .select('id, overall_score, audit_date, location, template_id, audit_templates(name), locations(name)')
        .eq('company_id', companyId!)
        .eq('audit_date', today)
        .in('status', ['completed', 'compliant', 'non_compliant']);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        templateName: row.audit_templates?.name ?? 'Audit',
        locationName: row.locations?.name ?? row.location ?? 'Unknown',
        overallScore: row.overall_score,
        auditDate: row.audit_date,
      }));
    },
  });
}

function useWeeklyAuditSummary(companyId: string | undefined) {
  const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['command-weekly-audits', companyId, monday],
    enabled: !!companyId,
    queryFn: async (): Promise<WeeklyAuditSummaryData> => {
      // Audits
      const { data: auditData, error: auditErr } = await supabase
        .from('location_audits')
        .select('id, overall_score, location, location_id, audit_templates(name), locations(name)')
        .eq('company_id', companyId!)
        .gte('audit_date', monday)
        .lte('audit_date', today)
        .in('status', ['completed', 'compliant', 'non_compliant']);

      if (auditErr) throw auditErr;

      const audits = auditData ?? [];
      const scores = audits.map((a: any) => a.overall_score).filter((s: any) => s != null);
      const locations = new Set(audits.map((a: any) => a.location_id).filter(Boolean));

      const negativeAudits = audits
        .filter((a: any) => a.overall_score != null && a.overall_score < 70)
        .map((a: any) => ({
          id: a.id,
          templateName: a.audit_templates?.name ?? 'Audit',
          locationName: a.locations?.name ?? a.location ?? 'Unknown',
          overallScore: a.overall_score,
          auditDate: '',
        }));

      // Active tasks (pending = not yet completed)
      const taskResult = await (supabase
        .from('tasks') as any)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId!)
        .eq('status', 'pending');
      const taskCount = taskResult.count as number | null;

      // Open CAs
      const { data: caData } = await supabase
        .from('corrective_actions')
        .select('id, due_at')
        .eq('company_id', companyId!)
        .in('status', ['open', 'in_progress']);

      const openCAs = caData?.length ?? 0;
      const overdueCAs = (caData ?? []).filter((ca: any) => ca.due_at && new Date(ca.due_at) < new Date()).length;

      // Shifts this week
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('id, required_count, shift_assignments(id, approval_status)')
        .eq('company_id', companyId!)
        .gte('shift_date', monday)
        .lte('shift_date', today)
        .eq('is_published', true)
        .in('status', ['published', 'open']);

      let shiftsScheduled = 0;
      let shiftsFilled = 0;
      for (const s of (shiftData ?? []) as any[]) {
        shiftsScheduled += s.required_count ?? 1;
        shiftsFilled += (s.shift_assignments ?? []).filter((a: any) => a.approval_status === 'approved').length;
      }

      return {
        totalCompleted: audits.length,
        averageScore: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
        locationsCount: locations.size,
        negativeAudits,
        openTasks: taskCount ?? 0,
        openCAs,
        overdueCAs,
        shiftsScheduled,
        shiftsFilled,
      };
    },
  });
}

function useMonthlyNegatives(companyId: string | undefined) {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['command-monthly-negatives', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<MonthlyNegativeData> => {
      // Low-score audits grouped by location
      const { data: lowAudits } = await supabase
        .from('location_audits')
        .select('overall_score, location, locations(name)')
        .eq('company_id', companyId!)
        .gte('audit_date', thirtyDaysAgo)
        .lte('audit_date', today)
        .in('status', ['completed', 'compliant', 'non_compliant'])
        .lt('overall_score', 70);

      const byLocation: Record<string, { total: number; count: number; name: string }> = {};
      (lowAudits ?? []).forEach((a: any) => {
        const locName = a.locations?.name ?? a.location ?? 'Unknown';
        if (!byLocation[locName]) byLocation[locName] = { total: 0, count: 0, name: locName };
        byLocation[locName].total += a.overall_score ?? 0;
        byLocation[locName].count += 1;
      });

      const lowScoreByLocation = Object.values(byLocation).map(l => ({
        locationName: l.name,
        avgScore: Math.round(l.total / l.count),
        count: l.count,
      }));

      // Corrective actions — full list
      const { data: caData } = await supabase
        .from('corrective_actions')
        .select('id, title, status, due_at, severity, location_id, locations(name)')
        .eq('company_id', companyId!)
        .in('status', ['open', 'in_progress'])
        .order('due_at', { ascending: true }) as { data: any[] | null };

      const now = new Date();
      const openCAList: OpenCAItem[] = (caData ?? []).map((ca: any) => ({
        id: ca.id,
        title: ca.title,
        locationName: ca.locations?.name ?? 'No location',
        severity: ca.severity ?? 'medium',
        dueAt: ca.due_at,
        isOverdue: ca.due_at ? new Date(ca.due_at) < now : false,
      }));

      // Late arrivals
      const { data: lateData } = await supabase
        .from('attendance_logs')
        .select('staff_id, employees!attendance_logs_staff_id_fkey(full_name)')
        .eq('is_late', true)
        .gte('check_in_at', subDays(new Date(), 30).toISOString());

      const lateByEmployee: Record<string, { name: string; count: number }> = {};
      (lateData ?? []).forEach((l: any) => {
        const key = l.staff_id;
        if (!lateByEmployee[key]) lateByEmployee[key] = { name: l.employees?.full_name ?? 'Unknown', count: 0 };
        lateByEmployee[key].count += 1;
      });

      const lateEmployees = Object.values(lateByEmployee)
        .filter(e => e.count > 3)
        .sort((a, b) => b.count - a.count)
        .map(e => ({ name: e.name, lateCount: e.count }));

      return { lowScoreByLocation, openCAList, lateEmployees };
    },
  });
}

// ── Main export ────────────────────────────────────────────────────

export function useMobileCommandData() {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const clockedIn = useClockedIn(companyId);
  const scheduledToday = useScheduledToday(companyId);
  const scheduledAudits = useTodayScheduledAudits(companyId);
  const completedAudits = useTodayCompletedAudits(companyId);
  const weeklySummary = useWeeklyAuditSummary(companyId);
  const monthlyNegatives = useMonthlyNegatives(companyId);

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['command-clocked-in'] }),
      queryClient.invalidateQueries({ queryKey: ['command-scheduled-today'] }),
      queryClient.invalidateQueries({ queryKey: ['command-scheduled-audits'] }),
      queryClient.invalidateQueries({ queryKey: ['command-completed-audits'] }),
      queryClient.invalidateQueries({ queryKey: ['command-weekly-audits'] }),
      queryClient.invalidateQueries({ queryKey: ['command-monthly-negatives'] }),
    ]);
  };

  return {
    clockedIn,
    scheduledToday,
    scheduledAudits,
    completedAudits,
    weeklySummary,
    monthlyNegatives,
    refetchAll,
    userRole: company?.userRole,
  };
}
