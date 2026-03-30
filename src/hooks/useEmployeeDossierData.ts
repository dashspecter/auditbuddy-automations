import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeePerformance, EmployeePerformanceScore } from "@/hooks/useEmployeePerformance";
import { useMonthlyScores, MonthlyScoreRow } from "@/hooks/useMonthlyScores";
import { useStaffAudits, StaffAudit } from "@/hooks/useStaffAudits";
import { useTestSubmissions, TestSubmission } from "@/hooks/useTestSubmissions";
import { computeEffectiveScore, EffectiveEmployeeScore } from "@/lib/effectiveScore";
import { STALE_TIME } from "@/lib/constants";

export interface AttendanceLogEntry {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  is_late: boolean | null;
  late_minutes: number | null;
  method: string;
  location_id: string;
  shift_id: string | null;
  notes: string | null;
  auto_clocked_out: boolean | null;
  locations?: { name: string };
}

export interface WarningEntry {
  id: string;
  event_type: string;
  event_date: string;
  description: string;
  amount: number | null;
  created_at: string;
}

export interface DossierData {
  employee: {
    id: string;
    full_name: string;
    role: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    location_name: string | null;
    additional_locations: string[];
  } | null;
  performanceScore: EffectiveEmployeeScore | null;
  monthlyHistory: MonthlyScoreRow[];
  attendanceLogs: AttendanceLogEntry[];
  staffAudits: StaffAudit[];
  testSubmissions: TestSubmission[];
  warnings: WarningEntry[];
  isLoading: boolean;
  error: Error | null;
}

export function useEmployeeDossierData(
  employeeId: string | null,
  startDate: string,
  endDate: string
): DossierData {
  // 1. Employee basic info
  const employeeQuery = useQuery({
    queryKey: ["dossier-employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, role, email, phone, avatar_url, location_id, locations(name), staff_locations(location_id, is_primary, locations(name))")
        .eq("id", employeeId)
        .single();
      if (error) throw error;
      const emp = data as any;
      const additionalLocations = (emp.staff_locations || [])
        .filter((sl: any) => !sl.is_primary && sl.locations?.name)
        .map((sl: any) => sl.locations.name);
      return {
        id: emp.id,
        full_name: emp.full_name,
        role: emp.role,
        email: emp.email,
        phone: emp.phone,
        avatar_url: emp.avatar_url,
        location_name: emp.locations?.name || null,
        additional_locations: additionalLocations,
      };
    },
    enabled: !!employeeId,
    staleTime: STALE_TIME.LONG,
  });

  // 2. Performance scores via RPC — SINGLE SOURCE OF TRUTH for the displayed score.
  //    Always use this for the current/selected period score. Never mix with monthlyQuery for display.
  const perfQuery = useEmployeePerformance(startDate, endDate);

  // 3. Monthly score history (archived snapshots) — used ONLY for trend charts / badge streaks.
  //    Do NOT use these values as the displayed score; they are historical and may lag the RPC.
  const monthlyQuery = useMonthlyScores(employeeId, 12);

  // 4. Attendance logs for the date range
  const attendanceQuery = useQuery({
    queryKey: ["dossier-attendance", employeeId, startDate, endDate],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id, check_in_at, check_out_at, is_late, late_minutes, method, location_id, shift_id, notes, auto_clocked_out, locations:location_id(name)")
        .eq("staff_id", employeeId)
        .gte("check_in_at", startDate)
        .lte("check_in_at", endDate + "T23:59:59")
        .order("check_in_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AttendanceLogEntry[];
    },
    enabled: !!employeeId,
    staleTime: STALE_TIME.MEDIUM,
  });

  // 5. Staff audits
  const auditsQuery = useStaffAudits(employeeId || undefined);

  // 6. Test submissions
  const testsQuery = useTestSubmissions(employeeId || undefined);

  // 7. Warnings (staff_events with warning types)
  const warningsQuery = useQuery({
    queryKey: ["dossier-warnings", employeeId, startDate, endDate],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("staff_events")
        .select("id, event_type, event_date, description, amount, created_at")
        .eq("staff_id", employeeId)
        .in("event_type", ["warning", "written_warning", "verbal_warning", "suspension", "final_warning"])
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data || []) as WarningEntry[];
    },
    enabled: !!employeeId,
    staleTime: STALE_TIME.MEDIUM,
  });

  // Compute effective score for the target employee
  const allScores = perfQuery.data || [];
  const employeePerf = allScores.find((s) => s.employee_id === employeeId) || null;
  const effectiveScore = employeePerf ? computeEffectiveScore(employeePerf) : null;

  const isLoading =
    employeeQuery.isLoading ||
    perfQuery.isLoading ||
    monthlyQuery.isLoading ||
    attendanceQuery.isLoading ||
    auditsQuery.isLoading ||
    testsQuery.isLoading ||
    warningsQuery.isLoading;

  const error =
    employeeQuery.error ||
    perfQuery.error ||
    monthlyQuery.error ||
    attendanceQuery.error ||
    auditsQuery.error ||
    testsQuery.error ||
    warningsQuery.error;

  return {
    employee: employeeQuery.data || null,
    performanceScore: effectiveScore,
    monthlyHistory: monthlyQuery.data || [],
    attendanceLogs: attendanceQuery.data || [],
    staffAudits: auditsQuery.data || [],
    testSubmissions: testsQuery.data || [],
    warnings: warningsQuery.data || [],
    isLoading,
    error: error as Error | null,
  };
}
