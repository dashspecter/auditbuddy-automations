import { useMemo } from "react";
import { useLocationAudits } from "./useAudits";

export interface LocationTrend {
  location: string;
  currentScore: number;
  previousScore: number;
  scoreDifference: number;
  percentageChange: number;
  trend: 'improvement' | 'decline' | 'stable';
  currentAuditDate: string;
  previousAuditDate: string;
  auditCount: number;
}

export const useLocationTrends = () => {
  const { data: audits, isLoading } = useLocationAudits();

  const locationTrends = useMemo(() => {
    if (!audits || audits.length === 0) return [];

    // Group audits by location
    const locationMap = new Map<string, any[]>();
    
    audits.forEach(audit => {
      const location = audit.location || 'Unknown Location';
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(audit);
    });

    // Calculate trends for each location
    const trends: LocationTrend[] = [];

    locationMap.forEach((locationAudits, location) => {
      // Sort by audit date (most recent first)
      const sortedAudits = locationAudits
        .filter(audit => audit.overall_score != null)
        .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime());

      // Need at least 2 audits to show a trend
      if (sortedAudits.length >= 2) {
        const currentAudit = sortedAudits[0];
        const previousAudit = sortedAudits[1];
        
        const currentScore = currentAudit.overall_score || 0;
        const previousScore = previousAudit.overall_score || 0;
        const scoreDifference = currentScore - previousScore;
        const percentageChange = previousScore > 0 
          ? ((scoreDifference / previousScore) * 100) 
          : 0;

        let trend: 'improvement' | 'decline' | 'stable';
        if (Math.abs(scoreDifference) < 2) {
          trend = 'stable';
        } else if (scoreDifference > 0) {
          trend = 'improvement';
        } else {
          trend = 'decline';
        }

        trends.push({
          location,
          currentScore,
          previousScore,
          scoreDifference,
          percentageChange,
          trend,
          currentAuditDate: currentAudit.audit_date,
          previousAuditDate: previousAudit.audit_date,
          auditCount: sortedAudits.length
        });
      }
    });

    // Sort by most recent audit date
    return trends.sort((a, b) => 
      new Date(b.currentAuditDate).getTime() - new Date(a.currentAuditDate).getTime()
    );
  }, [audits]);

  return {
    locationTrends,
    isLoading
  };
};
