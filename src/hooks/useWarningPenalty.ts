import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfMonth } from "date-fns";

export interface WarningMetadata {
  severity?: 'minor' | 'major' | 'critical';
  category?: 'attendance' | 'punctuality' | 'tasks' | 'hygiene_safety' | 'customer' | 'cash_inventory' | 'policy' | 'other';
  title?: string;
  notes?: string;
  evidence_url?: string | null;
  related_audit_id?: string | null;
}

export interface Warning {
  id: string;
  staff_id: string;
  event_date: string;
  metadata: WarningMetadata | null;
}

export interface WarningContribution {
  warningId: string;
  eventDate: string;
  severity: 'minor' | 'major' | 'critical';
  category: string;
  basePoints: number;
  repeatMultiplier: number;
  decayFactor: number;
  effectivePoints: number;
  monthKey: string;
}

export interface EmployeeWarningPenalty {
  employeeId: string;
  totalPenalty: number;
  warningCount: number;
  contributions: WarningContribution[];
  monthlyPenalties: Record<string, { raw: number; capped: number }>;
}

// Severity points
const SEVERITY_POINTS: Record<string, number> = {
  minor: 2,
  major: 5,
  critical: 10,
};

// Calculate decay factor based on age in days
function getDecayFactor(ageDays: number): number {
  if (ageDays < 0) return 0;
  if (ageDays <= 30) return 1.0;
  if (ageDays <= 60) return 0.6;
  if (ageDays <= 90) return 0.3;
  return 0;
}

// Calculate repeat multiplier based on position in 60-day rolling window
function getRepeatMultiplier(repeatIndex: number): number {
  if (repeatIndex === 0) return 1.0;
  if (repeatIndex === 1) return 1.5;
  return 2.0;
}

/**
 * Calculate warning penalty for a single employee
 */
export function calculateWarningPenalty(
  warnings: Warning[],
  referenceDate: Date = new Date()
): EmployeeWarningPenalty {
  if (!warnings.length) {
    return {
      employeeId: "",
      totalPenalty: 0,
      warningCount: 0,
      contributions: [],
      monthlyPenalties: {},
    };
  }

  const employeeId = warnings[0].staff_id;
  const contributions: WarningContribution[] = [];
  
  // Group warnings by category for repeat detection
  const warningsByCategory: Record<string, Warning[]> = {};
  
  // Sort warnings by date ascending for repeat calculation
  const sortedWarnings = [...warnings].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  
  for (const warning of sortedWarnings) {
    const category = warning.metadata?.category || 'other';
    if (!warningsByCategory[category]) {
      warningsByCategory[category] = [];
    }
    warningsByCategory[category].push(warning);
  }
  
  // Calculate contribution for each warning
  for (const warning of sortedWarnings) {
    const eventDate = new Date(warning.event_date);
    const ageDays = differenceInDays(referenceDate, eventDate);
    
    // Skip warnings older than 90 days
    if (ageDays > 90) continue;
    
    const severity = warning.metadata?.severity || 'minor';
    const category = warning.metadata?.category || 'other';
    const basePoints = SEVERITY_POINTS[severity] || 2;
    
    // Calculate repeat index (how many prior warnings in same category within 60 days)
    const categoryWarnings = warningsByCategory[category] || [];
    let repeatIndex = 0;
    
    for (const priorWarning of categoryWarnings) {
      if (priorWarning.id === warning.id) break;
      
      const priorDate = new Date(priorWarning.event_date);
      const daysDiff = differenceInDays(eventDate, priorDate);
      
      if (daysDiff <= 60 && daysDiff >= 0) {
        repeatIndex++;
      }
    }
    
    const repeatMultiplier = getRepeatMultiplier(repeatIndex);
    const decayFactor = getDecayFactor(ageDays);
    const effectivePoints = basePoints * repeatMultiplier * decayFactor;
    const monthKey = format(eventDate, 'yyyy-MM');
    
    contributions.push({
      warningId: warning.id,
      eventDate: warning.event_date,
      severity,
      category,
      basePoints,
      repeatMultiplier,
      decayFactor,
      effectivePoints,
      monthKey,
    });
  }
  
  // Group by month and apply cap
  const monthlyPenalties: Record<string, { raw: number; capped: number }> = {};
  
  for (const contribution of contributions) {
    const { monthKey, effectivePoints } = contribution;
    if (!monthlyPenalties[monthKey]) {
      monthlyPenalties[monthKey] = { raw: 0, capped: 0 };
    }
    monthlyPenalties[monthKey].raw += effectivePoints;
  }
  
  // Apply monthly cap of 10
  for (const monthKey of Object.keys(monthlyPenalties)) {
    monthlyPenalties[monthKey].capped = Math.min(10, monthlyPenalties[monthKey].raw);
  }
  
  // Total penalty is sum of capped monthly penalties
  const totalPenalty = Object.values(monthlyPenalties).reduce(
    (sum, mp) => sum + mp.capped,
    0
  );
  
  return {
    employeeId,
    totalPenalty,
    warningCount: contributions.length,
    contributions,
    monthlyPenalties,
  };
}

/**
 * Hook to fetch warnings and calculate penalties for multiple employees
 */
export const useWarningPenalties = (companyId?: string, locationId?: string) => {
  return useQuery({
    queryKey: ["warning-penalties", companyId, locationId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      let query = supabase
        .from("staff_events")
        .select("id, staff_id, event_date, metadata")
        .eq("company_id", companyId!)
        .eq("event_type", "warning")
        .gte("event_date", format(ninetyDaysAgo, 'yyyy-MM-dd'));
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Group warnings by employee
      const warningsByEmployee: Record<string, Warning[]> = {};
      
      for (const event of data || []) {
        const staffId = event.staff_id;
        if (!warningsByEmployee[staffId]) {
          warningsByEmployee[staffId] = [];
        }
        warningsByEmployee[staffId].push({
          id: event.id,
          staff_id: event.staff_id,
          event_date: event.event_date,
          metadata: event.metadata as WarningMetadata | null,
        });
      }
      
      // Calculate penalties for each employee
      const penalties: Record<string, EmployeeWarningPenalty> = {};
      
      for (const [employeeId, warnings] of Object.entries(warningsByEmployee)) {
        penalties[employeeId] = calculateWarningPenalty(warnings);
        penalties[employeeId].employeeId = employeeId;
      }
      
      return penalties;
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to get warning penalty for a single employee
 */
export const useEmployeeWarningPenalty = (employeeId?: string) => {
  return useQuery({
    queryKey: ["warning-penalty", employeeId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from("staff_events")
        .select("id, staff_id, event_date, metadata")
        .eq("staff_id", employeeId!)
        .eq("event_type", "warning")
        .gte("event_date", format(ninetyDaysAgo, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      const warnings: Warning[] = (data || []).map(event => ({
        id: event.id,
        staff_id: event.staff_id,
        event_date: event.event_date,
        metadata: event.metadata as WarningMetadata | null,
      }));
      
      return calculateWarningPenalty(warnings);
    },
    enabled: !!employeeId,
    staleTime: 60000,
  });
};
