import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStaffAudits } from "@/hooks/useStaffAudits";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeScore } from "@/hooks/useStaffAudits";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LocationSelector } from "@/components/LocationSelector";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EmployeePerformanceDetail } from "@/components/EmployeePerformanceDetail";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const StaffLeaderboard = () => {
  const [filterLocationId, setFilterLocationId] = useState<string>("__all__");
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const { data: audits } = useStaffAudits(
    undefined, 
    filterLocationId === "__all__" ? undefined : filterLocationId
  );
  const { data: employees } = useEmployees(
    filterLocationId === "__all__" ? undefined : filterLocationId
  );

  // Fetch all test submissions
  const { data: testSubmissions } = useQuery({
    queryKey: ["all-test-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_submissions")
        .select("id, employee_id, score, completed_at")
        .not("employee_id", "is", null)
        .not("score", "is", null)
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const leaderboardData = useMemo(() => {
    if (!audits || !employees) return [];

    // Group employees by location
    const locationGroups = new Map<string, any[]>();

    employees
      .filter(e => e.status === "active")
      .forEach((employee) => {
        const locationName = employee.locations?.name || "Unknown";
        
        // Get employee's staff audits
        const employeeAudits = audits
          .filter((a) => a.employee_id === employee.id)
          .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime())
          .map(a => ({ score: a.score, date: new Date(a.audit_date) }));

        // Get employee's test submissions
        const employeeTests = (testSubmissions || [])
          .filter((t) => t.employee_id === employee.id)
          .map(t => ({ score: t.score!, date: new Date(t.completed_at!) }));

        // Combine and sort all scores by date
        const allScores = [...employeeAudits, ...employeeTests]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 5);

        if (allScores.length === 0) {
          return;
        }

        const scores = allScores.map((s) => s.score);
        const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // Calculate trend
        let trend: "up" | "down" | "neutral" = "neutral";
        if (scores.length >= 2) {
          const recentAvg = (scores[0] + (scores[1] || scores[0])) / Math.min(2, scores.length);
          const olderScores = scores.slice(-2);
          const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
          if (recentAvg > olderAvg + 5) trend = "up";
          else if (recentAvg < olderAvg - 5) trend = "down";
        }

        const employeeData = {
          id: employee.id,
          name: employee.full_name,
          role: employee.role,
          location: locationName,
          average,
          trend,
          auditCount: allScores.length,
        };

        if (!locationGroups.has(locationName)) {
          locationGroups.set(locationName, []);
        }
        locationGroups.get(locationName)!.push(employeeData);
      });

    // Sort employees within each location by score (descending)
    locationGroups.forEach((employees) => {
      employees.sort((a, b) => b.average - a.average);
    });

    // Convert to array and sort locations by average score
    const locationArray = Array.from(locationGroups.entries()).map(([location, employees]) => {
      const locationAvg = Math.round(
        employees.reduce((sum, emp) => sum + emp.average, 0) / employees.length
      );
      return { location, employees, locationAvg };
    });

    locationArray.sort((a, b) => b.locationAvg - a.locationAvg);

    return locationArray;
  }, [audits, employees, testSubmissions]);

  const generatePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Staff Performance Leaderboard", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    if (filterLocationId && filterLocationId !== "__all__") {
      const location = leaderboardData[0]?.location || "Selected Location";
      doc.text(`Location: ${location}`, 14, 34);
    }

    let yPosition = (filterLocationId && filterLocationId !== "__all__") ? 42 : 38;

    leaderboardData.forEach((locationGroup) => {
      // Add location header
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(`${locationGroup.location} (Avg: ${locationGroup.locationAvg}%)`, 14, yPosition);
      yPosition += 8;

      const tableData = locationGroup.employees.map((emp, index) => [
        index + 1,
        emp.name,
        emp.role,
        `${emp.average}%`,
        emp.trend === "up" ? "↑" : emp.trend === "down" ? "↓" : "→",
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Rank", "Name", "Role", "Score", "Trend"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`staff-leaderboard-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Location Leaderboard</h2>
          <p className="text-muted-foreground mt-1">Rankings based on last 5 performance records (audits & tests)</p>
        </div>
        <Button onClick={generatePDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Generate PDF Report
        </Button>
      </div>

      <div className="mb-4">
        <LocationSelector
          value={filterLocationId}
          onValueChange={setFilterLocationId}
          placeholder="All Locations"
          allowAll
        />
      </div>

      <div className="space-y-6">
        {leaderboardData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No staff audit data available
          </p>
        ) : (
          leaderboardData.map((locationGroup) => (
            <div key={locationGroup.location} className="space-y-3">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                <div>
                  <h3 className="font-bold text-lg">{locationGroup.location}</h3>
                  <p className="text-sm text-muted-foreground">
                    {locationGroup.employees.length} employee{locationGroup.employees.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Avg: {locationGroup.locationAvg}%
                </Badge>
              </div>
              
              {locationGroup.employees.map((emp, index) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-4 ml-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee({ id: emp.id, name: emp.name, role: emp.role })}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-primary">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{emp.name}</p>
                      <p className="text-sm text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        emp.average >= 80
                          ? "default"
                          : emp.average >= 60
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-lg px-3 py-1"
                    >
                      {emp.average}%
                    </Badge>
                    {getTrendIcon(emp.trend)}
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
