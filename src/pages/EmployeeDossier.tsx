import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ArrowLeft, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useEmployeeDossierData } from "@/hooks/useEmployeeDossierData";
import { useEmployees } from "@/hooks/useEmployees";
import { ScoreOverviewSection } from "@/components/employee-dossier/ScoreOverviewSection";
import { AttendanceSection } from "@/components/employee-dossier/AttendanceSection";
import { TasksSection } from "@/components/employee-dossier/TasksSection";
import { AuditsSection } from "@/components/employee-dossier/AuditsSection";
import { TestsSection } from "@/components/employee-dossier/TestsSection";
import { WarningsSection } from "@/components/employee-dossier/WarningsSection";
import { DossierScoreHistory } from "@/components/employee-dossier/DossierScoreHistory";

type DatePreset = "last_30_days" | "this_month" | "last_month" | "last_3_months" | "custom";

function getPresetDates(preset: DatePreset) {
  const now = new Date();
  switch (preset) {
    case "last_30_days":
      return { from: subDays(now, 30), to: now };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "last_3_months":
      return { from: subMonths(now, 3), to: now };
    default:
      return { from: subDays(now, 30), to: now };
  }
}

export default function EmployeeDossier() {
  const { employeeId: paramId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(paramId || null);
  const [searchTerm, setSearchTerm] = useState("");

  // Date range
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(() => new Date());

  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  // Employee list for selector (only if no param)
  const { data: employees = [], isLoading: empLoading } = useEmployees(undefined, "active");

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const lower = searchTerm.toLowerCase();
    return employees.filter(
      (e) => e.full_name.toLowerCase().includes(lower) || e.role.toLowerCase().includes(lower)
    );
  }, [employees, searchTerm]);

  // Dossier data
  const dossier = useEmployeeDossierData(selectedEmployeeId, startDate, endDate);

  // If no employee selected, show selector
  if (!selectedEmployeeId) {
    return (
      <div className="space-y-4 p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Employee Dossier</h1>
        </div>
        <p className="text-sm text-muted-foreground">Select an employee to view their comprehensive report.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {empLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => {
                  setSelectedEmployeeId(emp.id);
                  navigate(`/employee-dossier/${emp.id}`, { replace: true });
                }}
                className="w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={emp.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{emp.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{emp.full_name}</div>
                  <div className="text-xs text-muted-foreground">{emp.role} {emp.locations?.name ? `• ${emp.locations.name}` : ""}</div>
                </div>
              </button>
            ))}
            {filteredEmployees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No employees found.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployeeId(null); navigate("/employee-dossier", { replace: true }); }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {dossier.isLoading && !dossier.employee ? (
          <Skeleton className="h-10 w-48" />
        ) : dossier.employee ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={dossier.employee.avatar_url || undefined} />
              <AvatarFallback>{dossier.employee.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{dossier.employee.full_name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{dossier.employee.role}</Badge>
                {dossier.employee.location_name && <span>{dossier.employee.location_name}</span>}
                {dossier.employee.additional_locations.map((loc) => (
                  <span key={loc} className="text-muted-foreground">+ {loc}</span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Date Range */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showPresets
        defaultPreset="last_30_days"
      />

      {/* Loading state */}
      {dossier.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      )}

      {/* Content */}
      {!dossier.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Score Overview - full width */}
          {dossier.performanceScore && (
            <div className="sm:col-span-2">
              <ScoreOverviewSection score={dossier.performanceScore} />
            </div>
          )}

          {/* Score History - full width */}
          <div className="sm:col-span-2">
            <DossierScoreHistory
              history={dossier.monthlyHistory}
              currentScore={dossier.performanceScore?.effective_score ?? null}
            />
          </div>

          {/* Attendance */}
          <AttendanceSection score={dossier.performanceScore} logs={dossier.attendanceLogs} />

          {/* Tasks */}
          <TasksSection score={dossier.performanceScore} />

          {/* Audits */}
          <AuditsSection audits={dossier.staffAudits} />

          {/* Tests */}
          <TestsSection
            submissions={dossier.testSubmissions}
            score={dossier.performanceScore ? {
              tests_taken: dossier.performanceScore.tests_taken,
              tests_passed: dossier.performanceScore.tests_passed,
              average_test_score: dossier.performanceScore.average_test_score,
            } : null}
          />

          {/* Warnings - full width */}
          <div className="sm:col-span-2">
            <WarningsSection
              warnings={dossier.warnings}
              warningPenalty={dossier.performanceScore?.warning_penalty ?? 0}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {dossier.error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dossier data: {dossier.error.message}
        </div>
      )}
    </div>
  );
}
