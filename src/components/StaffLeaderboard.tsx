import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEmployeePerformance } from "@/hooks/useEmployeePerformance";
import { computeEffectiveScores, formatEffectiveScore } from "@/lib/effectiveScore";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LocationSelector } from "@/components/LocationSelector";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addBrandedHeader, addBrandedFooter, getBrandedTableStyles, addSectionTitle } from "@/lib/pdfBranding";
import { EmployeePerformanceDetail } from "@/components/EmployeePerformanceDetail";
import { subMonths, format, startOfDay, endOfDay } from "date-fns";

// StaffLeaderboard uses the CANONICAL effective score calculation (computeEffectiveScore)
// — the same engine used by EmployeeDossier and WorkforceAnalytics.
// Never compute scores inline here; always delegate to computeEffectiveScores().

export const StaffLeaderboard = () => {
  const [filterLocationId, setFilterLocationId] = useState<string>("__all__");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);

  const startDate = dateFrom ? format(startOfDay(dateFrom), "yyyy-MM-dd") : undefined;
  const endDate = dateTo ? format(endOfDay(dateTo), "yyyy-MM-dd") : undefined;
  const locationId = filterLocationId === "__all__" ? undefined : filterLocationId;

  const { data: rawScores = [], isLoading } = useEmployeePerformance(startDate, endDate, locationId);

  const leaderboardData = useMemo(() => {
    if (!rawScores.length) return [];

    // Use canonical effective score — same as EmployeeDossier and WorkforceAnalytics
    const effectiveScores = computeEffectiveScores(rawScores, true); // filterInactive=true

    // Group by location
    const locationGroups = new Map<string, typeof effectiveScores>();
    effectiveScores.forEach((emp) => {
      const loc = emp.location_name || "Unknown";
      if (!locationGroups.has(loc)) locationGroups.set(loc, []);
      locationGroups.get(loc)!.push(emp);
    });

    // Sort employees within each location by effective score (desc)
    locationGroups.forEach((emps) => {
      emps.sort((a, b) => (b.effective_score ?? -1) - (a.effective_score ?? -1));
    });

    // Build location array sorted by average effective score
    return Array.from(locationGroups.entries())
      .map(([location, employees]) => {
        const validScores = employees.filter(e => e.effective_score !== null);
        const locationAvg = validScores.length
          ? validScores.reduce((sum, e) => sum + (e.effective_score ?? 0), 0) / validScores.length
          : 0;
        return { location, employees, locationAvg };
      })
      .sort((a, b) => b.locationAvg - a.locationAvg);
  }, [rawScores]);

  const generatePDF = () => {
    const doc = new jsPDF();
    addBrandedHeader(doc, "Staff Performance Leaderboard", locationId ? leaderboardData[0]?.location : undefined);
    let yPosition = 55;

    leaderboardData.forEach((locationGroup) => {
      if (yPosition > 250) { doc.addPage(); yPosition = 20; }
      yPosition = addSectionTitle(doc, `${locationGroup.location} (Avg: ${locationGroup.locationAvg.toFixed(1)}%)`, yPosition);

      const tableData = locationGroup.employees.map((emp, index) => [
        index + 1,
        emp.employee_name,
        emp.role,
        `${formatEffectiveScore(emp.effective_score)}%`,
        emp.used_components_count,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Rank", "Name", "Role", "Score", "Components"]],
        body: tableData,
        ...getBrandedTableStyles(),
        margin: { left: 15, right: 15 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    });

    addBrandedFooter(doc);
    doc.save(`staff-leaderboard-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Employee Performance</h2>
          <p className="text-muted-foreground mt-1">Effective score — weighted average of active components</p>
        </div>
        <Button onClick={generatePDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Generate PDF Report
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <LocationSelector
          value={filterLocationId}
          onValueChange={setFilterLocationId}
          placeholder="All Locations"
          allowAll
        />
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : leaderboardData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No performance data available for this period</p>
        ) : (
          leaderboardData.map((locationGroup) => (
            <div key={locationGroup.location} className="space-y-3">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <div>
                  <h3 className="font-bold text-lg">{locationGroup.location}</h3>
                  <p className="text-sm text-muted-foreground">
                    {locationGroup.employees.length} employee{locationGroup.employees.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Avg: {locationGroup.locationAvg.toFixed(1)}%
                </Badge>
              </div>

              {locationGroup.employees.map((emp, index) => (
                <div
                  key={emp.employee_id}
                  className="flex items-center justify-between p-4 ml-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee({ id: emp.employee_id, name: emp.employee_name, role: emp.role })}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-primary">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{emp.employee_name}</p>
                      <p className="text-sm text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        (emp.effective_score ?? 0) >= 80
                          ? "default"
                          : (emp.effective_score ?? 0) >= 60
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-lg px-3 py-1"
                    >
                      {formatEffectiveScore(emp.effective_score)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <EmployeePerformanceDetail
        employeeId={selectedEmployee?.id || null}
        employeeName={selectedEmployee?.name || ""}
        employeeRole={selectedEmployee?.role || ""}
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      />
    </Card>
  );
};
