import { useMemo } from "react";
import { useLocationAudits } from "./useAudits";

export interface SectionPerformance {
  sectionName: string;
  avgScore: number;
  trend: 'improving' | 'declining' | 'stable';
  dataPoints: Array<{
    date: string;
    score: number;
  }>;
}

export interface LocationPerformance {
  locationId: string;
  locationName: string;
  overallTrend: 'improving' | 'declining' | 'stable';
  avgScore: number;
  sections: SectionPerformance[];
  weakestAreas: Array<{ section: string; score: number }>;
  bestImprovements: Array<{ section: string; improvement: number }>;
  audits: any[];
}

const SECTION_MAPPINGS = {
  compliance_licenses: "Compliance - Licenses",
  compliance_permits: "Compliance - Permits",
  compliance_signage: "Compliance - Signage",
  compliance_documentation: "Compliance - Documentation",
  boh_storage: "Back of House - Storage",
  boh_temperature: "Back of House - Temperature",
  boh_preparation: "Back of House - Preparation",
  boh_equipment: "Back of House - Equipment",
  cleaning_surfaces: "Cleaning - Surfaces",
  cleaning_floors: "Cleaning - Floors",
  cleaning_equipment: "Cleaning - Equipment",
  cleaning_waste: "Cleaning - Waste",
  foh_customer_areas: "Front of House - Customer Areas",
  foh_restrooms: "Front of House - Restrooms",
  foh_menu_boards: "Front of House - Menu Boards",
  foh_seating: "Front of House - Seating",
};

export const usePerformanceTrends = (locationFilter?: string, dateFrom?: Date, dateTo?: Date, templateFilter?: string) => {
  const { data: audits, isLoading } = useLocationAudits();

  const filteredAudits = useMemo(() => {
    if (!audits) return [];
    
    return audits.filter(audit => {
      const auditDate = new Date(audit.audit_date);
      
      if (locationFilter && audit.location_id !== locationFilter) return false;
      if (dateFrom && auditDate < dateFrom) return false;
      if (dateTo && auditDate > dateTo) return false;
      if (templateFilter && audit.template_id !== templateFilter) return false;
      
      return audit.overall_score != null;
    });
  }, [audits, locationFilter, dateFrom, dateTo, templateFilter]);

  const sectionPerformance = useMemo(() => {
    if (filteredAudits.length === 0) return [];

    const sectionData: Record<string, { scores: number[]; dates: string[] }> = {};
    
    Object.keys(SECTION_MAPPINGS).forEach(key => {
      sectionData[key] = { scores: [], dates: [] };
    });

    filteredAudits
      .sort((a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime())
      .forEach(audit => {
        Object.keys(SECTION_MAPPINGS).forEach(key => {
          const score = audit[key as keyof typeof audit];
          if (typeof score === 'number') {
            sectionData[key].scores.push(score * 20); // Convert 0-5 to 0-100
            sectionData[key].dates.push(audit.audit_date);
          }
        });
      });

    return Object.entries(SECTION_MAPPINGS).map(([key, name]) => {
      const data = sectionData[key];
      if (data.scores.length === 0) return null;

      const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
      
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (data.scores.length >= 2) {
        const firstHalf = data.scores.slice(0, Math.floor(data.scores.length / 2));
        const secondHalf = data.scores.slice(Math.floor(data.scores.length / 2));
        const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
        const diff = secondAvg - firstAvg;
        
        if (Math.abs(diff) < 5) trend = 'stable';
        else trend = diff > 0 ? 'improving' : 'declining';
      }

      return {
        sectionName: name,
        avgScore: Math.round(avgScore),
        trend,
        dataPoints: data.dates.map((date, i) => ({
          date,
          score: Math.round(data.scores[i])
        }))
      } as SectionPerformance;
    }).filter(Boolean) as SectionPerformance[];
  }, [filteredAudits]);

  const locationPerformance = useMemo(() => {
    if (!audits) return [];

    const locationMap = new Map<string, { id: string; name: string; audits: any[] }>();
    
    audits.forEach(audit => {
      if (audit.overall_score == null) return;
      
      const locationId = audit.location_id || 'unknown';
      const locationName = audit.locations?.name || audit.location || 'Unknown Location';
      
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          id: locationId,
          name: locationName,
          audits: []
        });
      }
      locationMap.get(locationId)!.audits.push(audit);
    });

    return Array.from(locationMap.values()).map((locationData) => {
      const { id: locationId, name: locationName, audits: locationAudits } = locationData;
      
      locationAudits.sort((a, b) => 
        new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime()
      );

      const avgScore = locationAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / locationAudits.length;
      
      let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (locationAudits.length >= 2) {
        const firstHalf = locationAudits.slice(0, Math.floor(locationAudits.length / 2));
        const secondHalf = locationAudits.slice(Math.floor(locationAudits.length / 2));
        const firstAvg = firstHalf.reduce((sum, a) => sum + (a.overall_score || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, a) => sum + (a.overall_score || 0), 0) / secondHalf.length;
        const diff = secondAvg - firstAvg;
        
        if (Math.abs(diff) < 3) overallTrend = 'stable';
        else overallTrend = diff > 0 ? 'improving' : 'declining';
      }

      const sectionScores: Record<string, number[]> = {};
      Object.keys(SECTION_MAPPINGS).forEach(key => {
        sectionScores[key] = [];
      });

      locationAudits.forEach(audit => {
        Object.keys(SECTION_MAPPINGS).forEach(key => {
          const score = audit[key as keyof typeof audit];
          if (typeof score === 'number') {
            sectionScores[key].push(score * 20);
          }
        });
      });

      const sections: SectionPerformance[] = Object.entries(SECTION_MAPPINGS)
        .map(([key, name]) => {
          const scores = sectionScores[key];
          if (scores.length === 0) return null;

          const avgSectionScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          
          let sectionTrend: 'improving' | 'declining' | 'stable' = 'stable';
          if (scores.length >= 2) {
            const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
            const secondHalf = scores.slice(Math.floor(scores.length / 2));
            const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
            const diff = secondAvg - firstAvg;
            
            if (Math.abs(diff) < 5) sectionTrend = 'stable';
            else sectionTrend = diff > 0 ? 'improving' : 'declining';
          }

          return {
            sectionName: name,
            avgScore: Math.round(avgSectionScore),
            trend: sectionTrend,
            dataPoints: locationAudits.map((audit, i) => ({
              date: audit.audit_date,
              score: Math.round(scores[i] || 0)
            }))
          };
        })
        .filter(Boolean) as SectionPerformance[];

      const sortedSections = [...sections].sort((a, b) => a.avgScore - b.avgScore);
      const weakestAreas = sortedSections.slice(0, 3).map(s => ({
        section: s.sectionName,
        score: s.avgScore
      }));

      const improvingSections = sections
        .filter(s => s.trend === 'improving')
        .map(s => {
          const firstScore = s.dataPoints[0]?.score || 0;
          const lastScore = s.dataPoints[s.dataPoints.length - 1]?.score || 0;
          return {
            section: s.sectionName,
            improvement: lastScore - firstScore
          };
        })
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 3);

      return {
        locationId,
        locationName,
        overallTrend,
        avgScore: Math.round(avgScore),
        sections,
        weakestAreas,
        bestImprovements: improvingSections,
        audits: locationAudits
      } as LocationPerformance;
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [audits]);

  return {
    sectionPerformance,
    locationPerformance,
    isLoading
  };
};
