import { useMemo } from "react";
import { useLocationAudits } from "./useAudits";
import { useCachedSectionScores, type AuditWithCachedScores, type CachedSectionScore } from "./useCachedSectionScores";
import { useCompanyContext } from "@/contexts/CompanyContext";

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

// ─── Helpers ─────────────────────────────────────────────────

const computeTrend = (scores: number[]): 'improving' | 'declining' | 'stable' => {
  if (scores.length < 2) return 'stable';
  const mid = Math.floor(scores.length / 2);
  const firstAvg = scores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const secondAvg = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid);
  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 5) return 'stable';
  return diff > 0 ? 'improving' : 'declining';
};

/** Extract section scores from the cached JSONB column */
const extractSections = (cached: Record<string, CachedSectionScore> | null) => {
  if (!cached) return [];
  return Object.values(cached).filter(s => s.scored_fields > 0);
};

const buildSectionPerformance = (
  audits: AuditWithCachedScores[]
): SectionPerformance[] => {
  const sectionData: Record<string, { scores: number[]; dates: string[]; sectionName: string }> = {};

  const sorted = [...audits].sort(
    (a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime()
  );

  sorted.forEach(audit => {
    const sections = extractSections(audit.cached_section_scores);
    sections.forEach(sec => {
      if (!sectionData[sec.section_name]) {
        sectionData[sec.section_name] = { scores: [], dates: [], sectionName: sec.section_name };
      }
      sectionData[sec.section_name].scores.push(sec.total_score);
      sectionData[sec.section_name].dates.push(audit.audit_date);
    });
  });

  return Object.values(sectionData)
    .map(data => ({
      sectionName: data.sectionName,
      avgScore: data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 0,
      trend: computeTrend(data.scores),
      dataPoints: data.dates.map((date, i) => ({ date, score: data.scores[i] })),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
};

// ─── Main hook ───────────────────────────────────────────────

export const usePerformanceTrends = (
  locationFilter?: string,
  dateFrom?: Date,
  dateTo?: Date,
  templateFilter?: string
) => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const { data: cachedAudits = [], isLoading: cachedLoading } = useCachedSectionScores(
    locationFilter,
    dateFrom?.toISOString().split("T")[0],
    dateTo?.toISOString().split("T")[0],
    templateFilter
  );

  const isLoading = auditsLoading || cachedLoading;

  // Filter audits that have scores (for location performance which uses overall_score)
  const filteredAudits = useMemo(() => {
    if (!audits) return [];
    return audits.filter(audit => {
      const auditDate = new Date(audit.audit_date);
      if (locationFilter && locationFilter !== "all" && audit.location_id !== locationFilter) return false;
      if (dateFrom && auditDate < dateFrom) return false;
      if (dateTo && auditDate > dateTo) return false;
      if (templateFilter && templateFilter !== "all" && audit.template_id !== templateFilter) return false;
      return audit.overall_score != null && audit.overall_score > 0;
    });
  }, [audits, locationFilter, dateFrom, dateTo, templateFilter]);

  // Section performance from cached scores (Phase 3 — no joins needed)
  const sectionPerformance = useMemo(() => {
    if (cachedAudits.length === 0) return [];
    // Only include audits with a positive overall score
    const scored = cachedAudits.filter(a => a.overall_score != null && (a.overall_score ?? 0) > 0);
    return buildSectionPerformance(scored);
  }, [cachedAudits]);

  // Location performance (uses overall_score from audits + cached sections)
  const locationPerformance = useMemo(() => {
    if (!audits) return [];

    const locationMap = new Map<string, { id: string; name: string; audits: any[] }>();

    audits.forEach(audit => {
      if (audit.overall_score == null || audit.overall_score === 0) return;
      const locationId = audit.location_id || 'unknown';
      const locationName = (audit as any).locations?.name || (audit as any).location || 'Unknown Location';
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName, audits: [] });
      }
      locationMap.get(locationId)!.audits.push(audit);
    });

    return Array.from(locationMap.values()).map(locData => {
      const { id: locationId, name: locationName, audits: locationAudits } = locData;

      locationAudits.sort((a: any, b: any) =>
        new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime()
      );

      const avgScore = Math.round(
        locationAudits.reduce((sum: number, a: any) => sum + (a.overall_score || 0), 0) / locationAudits.length
      );

      const overallTrend = computeTrend(locationAudits.map((a: any) => a.overall_score || 0));

      // Use cached section scores for this location's audits
      const locationCachedAudits = cachedAudits.filter(ca => ca.location_id === locationId);
      const sections = buildSectionPerformance(locationCachedAudits);

      const sortedSections = [...sections].sort((a, b) => a.avgScore - b.avgScore);
      const weakestAreas = sortedSections.slice(0, 3).map(s => ({
        section: s.sectionName,
        score: s.avgScore
      }));

      const bestImprovements = sections
        .filter(s => s.trend === 'improving' && s.dataPoints.length >= 2)
        .map(s => ({
          section: s.sectionName,
          improvement: (s.dataPoints[s.dataPoints.length - 1]?.score || 0) - (s.dataPoints[0]?.score || 0)
        }))
        .filter(s => s.improvement > 0)
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 3);

      return {
        locationId,
        locationName,
        overallTrend,
        avgScore,
        sections,
        weakestAreas,
        bestImprovements,
        audits: locationAudits
      } as LocationPerformance;
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [audits, cachedAudits]);

  return {
    sectionPerformance,
    locationPerformance,
    isLoading
  };
};
