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

export const StaffLeaderboard = () => {
  const [filterLocationId, setFilterLocationId] = useState<string>("__all__");
  const { data: audits } = useStaffAudits(
    undefined, 
    filterLocationId === "__all__" ? undefined : filterLocationId
  );
  const { data: employees } = useEmployees(
    filterLocationId === "__all__" ? undefined : filterLocationId
  );

  const leaderboardData = useMemo(() => {
    if (!audits || !employees) return [];

    const employeeScores = employees
      .filter(e => e.status === "active")
      .map((employee) => {
        const employeeAudits = audits
          .filter((a) => a.employee_id === employee.id)
          .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime())
          .slice(0, 5);

        if (employeeAudits.length === 0) {
          return null;
        }

        const scores = employeeAudits.map((a) => a.score);
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

        return {
          id: employee.id,
          name: employee.full_name,
          role: employee.role,
          location: employee.locations?.name || "Unknown",
          average,
          trend,
          auditCount: employeeAudits.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.average || 0) - (a?.average || 0));

    return employeeScores;
  }, [audits, employees]);

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

    const tableData = leaderboardData.map((emp, index) => [
      index + 1,
      emp?.name || "",
      emp?.role || "",
      emp?.location || "",
      `${emp?.average || 0}%`,
      emp?.trend === "up" ? "↑" : emp?.trend === "down" ? "↓" : "→",
    ]);

    autoTable(doc, {
      startY: (filterLocationId && filterLocationId !== "__all__") ? 40 : 35,
      head: [["Rank", "Name", "Role", "Location", "Score", "Trend"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
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
          <h2 className="text-2xl font-bold">Staff Leaderboard</h2>
          <p className="text-muted-foreground mt-1">Rankings based on last 5 audits</p>
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

      <div className="space-y-3">
        {leaderboardData.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No staff audit data available
          </p>
        ) : (
          leaderboardData.map((emp, index) => (
            <div
              key={emp?.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-primary">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-semibold">{emp?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {emp?.role} • {emp?.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    (emp?.average || 0) >= 80
                      ? "default"
                      : (emp?.average || 0) >= 60
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-lg px-3 py-1"
                >
                  {emp?.average}%
                </Badge>
                {getTrendIcon(emp?.trend || "neutral")}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
