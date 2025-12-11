import { useMemo } from "react";
import { useLocationAudits } from "./useAudits";
import { startOfDay, endOfDay } from "date-fns";

interface DashboardStatsOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export const useDashboardStats = (options?: DashboardStatsOptions) => {
  const { data: audits, isLoading } = useLocationAudits();

  const stats = useMemo(() => {
    if (!audits) {
      return {
        totalAudits: 0,
        completedAudits: 0,
        overdueAudits: 0,
        avgScore: 0,
        worstLocation: { name: 'N/A', score: 0 },
        bestLocation: { name: 'N/A', score: 0 },
      };
    }

    // Filter audits by date range if provided
    let filteredAudits = audits;
    if (options?.dateFrom || options?.dateTo) {
      filteredAudits = audits.filter(audit => {
        const auditDate = new Date(audit.audit_date);
        if (options.dateFrom && auditDate < startOfDay(options.dateFrom)) return false;
        if (options.dateTo && auditDate > endOfDay(options.dateTo)) return false;
        return true;
      });
    }

    const totalAudits = filteredAudits.length;
    const completedAudits = filteredAudits.filter(a => a.status === 'compliant').length;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day
    
    const overdueAudits = filteredAudits.filter(a => {
      if (a.status === 'compliant') return false;
      const auditDate = new Date(a.audit_date);
      auditDate.setHours(0, 0, 0, 0);
      return auditDate < now && (a.status === 'pending' || a.status === 'draft');
    }).length;

    const totalScore = filteredAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0);
    const avgScore = totalAudits > 0 ? Math.round(totalScore / totalAudits) : 0;

    const locationScores = new Map<string, { total: number; count: number; name: string }>();
    
    filteredAudits.forEach(audit => {
      const locationName = audit.locations?.name || audit.location || 'Unknown';
      const locationId = audit.location_id || locationName;
      
      if (!locationScores.has(locationId)) {
        locationScores.set(locationId, { total: 0, count: 0, name: locationName });
      }
      
      const loc = locationScores.get(locationId)!;
      loc.total += audit.overall_score || 0;
      loc.count += 1;
    });

    const locationAverages = Array.from(locationScores.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const worstLocation = locationAverages[0] || { name: 'N/A', avgScore: 0 };
    const bestLocation = locationAverages[locationAverages.length - 1] || { name: 'N/A', avgScore: 0 };

    return {
      totalAudits,
      completedAudits,
      overdueAudits,
      avgScore,
      worstLocation: { name: worstLocation.name, score: worstLocation.avgScore },
      bestLocation: { name: bestLocation.name, score: bestLocation.avgScore },
    };
  }, [audits, options?.dateFrom, options?.dateTo]);

  return { ...stats, isLoading };
};
