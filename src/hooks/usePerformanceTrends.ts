import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface FieldResponseWithDetails {
  id: string;
  audit_id: string;
  section_id: string;
  field_id: string;
  response_value: any;
  audit_fields: {
    id: string;
    field_type: string;
    options: any;
  } | null;
  audit_sections: {
    id: string;
    name: string;
  } | null;
}

// Helper to check if a field type is binary (yes/no, checkbox)
const isBinaryField = (fieldType: string) =>
  fieldType === "yes_no" || fieldType === "yesno" || fieldType === "checkbox";

// Calculate section score from field responses
const calculateSectionScore = (
  responses: FieldResponseWithDetails[],
  sectionId: string
): number => {
  const sectionResponses = responses.filter(r => r.section_id === sectionId);
  
  let totalScore = 0;
  let maxPossibleScore = 0;

  sectionResponses.forEach(response => {
    const fieldType = response.audit_fields?.field_type;
    const value = response.response_value;
    const maxValue = response.audit_fields?.options?.max || 5;

    if (!fieldType) return;

    // Rating fields
    if (fieldType === 'rating') {
      maxPossibleScore += maxValue;
      if (value !== undefined && value !== null && value !== '') {
        totalScore += Number(value);
      }
    }

    // Binary fields (yes_no, checkbox)
    if (isBinaryField(fieldType)) {
      maxPossibleScore += 1;
      // Handle various formats: "yes", "Yes", true, "true", etc.
      const positiveValues = ['yes', 'Yes', 'true', 'TRUE', 'True'];
      if (value === true || positiveValues.includes(String(value))) {
        totalScore += 1;
      }
      // "no", "false", false values contribute 0 to totalScore but still count toward maxPossibleScore
    }
  });

  if (maxPossibleScore === 0) return 0;
  return Math.round((totalScore / maxPossibleScore) * 100);
};

// Fetch all field responses with section and field details for company audits
const useAllFieldResponses = () => {
  return useQuery({
    queryKey: ["all_field_responses_for_trends"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's company via company_users junction table
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!companyUser?.company_id) return [];

      // Get all audits for the company
      const { data: audits } = await supabase
        .from("location_audits")
        .select("id")
        .eq("company_id", companyUser.company_id);

      if (!audits || audits.length === 0) return [];

      const auditIds = audits.map(a => a.id);

      // Fetch field responses with joined section and field info
      const { data, error } = await supabase
        .from("audit_field_responses")
        .select(`
          id,
          audit_id,
          section_id,
          field_id,
          response_value,
          audit_fields (
            id,
            field_type,
            options
          ),
          audit_sections (
            id,
            name
          )
        `)
        .in("audit_id", auditIds);

      if (error) throw error;
      return (data || []) as FieldResponseWithDetails[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const usePerformanceTrends = (
  locationFilter?: string, 
  dateFrom?: Date, 
  dateTo?: Date, 
  templateFilter?: string
) => {
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();
  const { data: allFieldResponses = [], isLoading: responsesLoading } = useAllFieldResponses();

  const isLoading = auditsLoading || responsesLoading;

  // Filter audits based on criteria
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

  // Build section performance across all filtered audits
  const sectionPerformance = useMemo(() => {
    if (filteredAudits.length === 0 || allFieldResponses.length === 0) return [];

    // Group responses by section name, then by audit
    const sectionData: Record<string, { 
      scores: number[]; 
      dates: string[];
      sectionName: string;
    }> = {};

    // Sort audits by date
    const sortedAudits = [...filteredAudits].sort(
      (a, b) => new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime()
    );

    sortedAudits.forEach(audit => {
      const auditResponses = allFieldResponses.filter(r => r.audit_id === audit.id);
      
      // Group by section
      const sectionIds = [...new Set(auditResponses.map(r => r.section_id))];
      
      sectionIds.forEach(sectionId => {
        const sectionResponse = auditResponses.find(r => r.section_id === sectionId);
        const sectionName = sectionResponse?.audit_sections?.name || 'Unknown Section';
        
        const score = calculateSectionScore(auditResponses, sectionId);
        
        // Only include sections with scoreable data
        if (score > 0 || auditResponses.some(r => 
          r.section_id === sectionId && 
          (r.audit_fields?.field_type === 'rating' || isBinaryField(r.audit_fields?.field_type || ''))
        )) {
          if (!sectionData[sectionName]) {
            sectionData[sectionName] = { scores: [], dates: [], sectionName };
          }
          sectionData[sectionName].scores.push(score);
          sectionData[sectionName].dates.push(audit.audit_date);
        }
      });
    });

    // Calculate trends for each section
    return Object.values(sectionData).map(data => {
      const avgScore = data.scores.length > 0 
        ? Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length)
        : 0;

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
        sectionName: data.sectionName,
        avgScore,
        trend,
        dataPoints: data.dates.map((date, i) => ({
          date,
          score: data.scores[i]
        }))
      } as SectionPerformance;
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredAudits, allFieldResponses]);

  // Build location-specific performance
  const locationPerformance = useMemo(() => {
    if (!audits || allFieldResponses.length === 0) return [];

    // Group audits by location
    const locationMap = new Map<string, { id: string; name: string; audits: any[] }>();

    audits.forEach(audit => {
      if (audit.overall_score == null || audit.overall_score === 0) return;

      const locationId = audit.location_id || 'unknown';
      const locationName = audit.locations?.name || audit.location || 'Unknown Location';

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName, audits: [] });
      }
      locationMap.get(locationId)!.audits.push(audit);
    });

    return Array.from(locationMap.values()).map(locationData => {
      const { id: locationId, name: locationName, audits: locationAudits } = locationData;

      // Sort by date
      locationAudits.sort((a, b) =>
        new Date(a.audit_date).getTime() - new Date(b.audit_date).getTime()
      );

      const avgScore = Math.round(
        locationAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / locationAudits.length
      );

      // Calculate overall trend
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

      // Calculate section performance for this location
      const sectionData: Record<string, {
        scores: number[];
        dates: string[];
        sectionName: string;
      }> = {};

      locationAudits.forEach(audit => {
        const auditResponses = allFieldResponses.filter(r => r.audit_id === audit.id);
        const sectionIds = [...new Set(auditResponses.map(r => r.section_id))];

        sectionIds.forEach(sectionId => {
          const sectionResponse = auditResponses.find(r => r.section_id === sectionId);
          const sectionName = sectionResponse?.audit_sections?.name || 'Unknown Section';

          const score = calculateSectionScore(auditResponses, sectionId);

          if (score > 0 || auditResponses.some(r =>
            r.section_id === sectionId &&
            (r.audit_fields?.field_type === 'rating' || isBinaryField(r.audit_fields?.field_type || ''))
          )) {
            if (!sectionData[sectionName]) {
              sectionData[sectionName] = { scores: [], dates: [], sectionName };
            }
            sectionData[sectionName].scores.push(score);
            sectionData[sectionName].dates.push(audit.audit_date);
          }
        });
      });

      // Build section performance array
      const sections: SectionPerformance[] = Object.values(sectionData).map(data => {
        const avgSectionScore = data.scores.length > 0
          ? Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length)
          : 0;

        let sectionTrend: 'improving' | 'declining' | 'stable' = 'stable';
        if (data.scores.length >= 2) {
          const firstHalf = data.scores.slice(0, Math.floor(data.scores.length / 2));
          const secondHalf = data.scores.slice(Math.floor(data.scores.length / 2));
          const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
          const diff = secondAvg - firstAvg;

          if (Math.abs(diff) < 5) sectionTrend = 'stable';
          else sectionTrend = diff > 0 ? 'improving' : 'declining';
        }

        return {
          sectionName: data.sectionName,
          avgScore: avgSectionScore,
          trend: sectionTrend,
          dataPoints: data.dates.map((date, i) => ({
            date,
            score: data.scores[i]
          }))
        };
      });

      // Weakest areas (bottom 3 by score)
      const sortedSections = [...sections].sort((a, b) => a.avgScore - b.avgScore);
      const weakestAreas = sortedSections.slice(0, 3).map(s => ({
        section: s.sectionName,
        score: s.avgScore
      }));

      // Best improvements (top 3 sections with improving trend)
      const bestImprovements = sections
        .filter(s => s.trend === 'improving' && s.dataPoints.length >= 2)
        .map(s => {
          const firstScore = s.dataPoints[0]?.score || 0;
          const lastScore = s.dataPoints[s.dataPoints.length - 1]?.score || 0;
          return {
            section: s.sectionName,
            improvement: lastScore - firstScore
          };
        })
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
  }, [audits, allFieldResponses]);

  return {
    sectionPerformance,
    locationPerformance,
    isLoading
  };
};
