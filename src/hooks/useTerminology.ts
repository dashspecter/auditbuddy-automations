import { useLabels } from "@/hooks/useLabels";
import { useCallback } from "react";

/**
 * Centralized terminology hook. Returns singular/plural terms
 * that respect company_label_overrides (e.g. "Employees" → "Civil Servants").
 * Non-overridden companies see the defaults — zero visual change.
 *
 * DB stores plural keys: employees, locations, shifts, audits, equipment
 * and singular keys: company, manager, owner.
 * Singular forms for employee/location/shift/audit are derived from the plural.
 */

/** Naive singular derivation: "Civil Servants" → "Civil Servant", "Departments" → "Department" */
function deriveSingular(plural: string, defaultSingular: string): string {
  if (plural === defaultSingular) return defaultSingular;
  // If it ends with 's' (but not 'ss'), strip it
  if (plural.endsWith("s") && !plural.endsWith("ss")) {
    return plural.slice(0, -1);
  }
  return plural;
}

export const useTerminology = () => {
  const { label } = useLabels();

  // Plural forms (stored in DB)
  const employees = useCallback(() => label("employees", "Employees"), [label]);
  const locations = useCallback(() => label("locations", "Locations"), [label]);
  const shifts = useCallback(() => label("shifts", "Shifts"), [label]);
  const audits = useCallback(() => label("audits", "Audits"), [label]);

  // Singular forms (derived from plural overrides)
  const employee = useCallback(() => deriveSingular(employees(), "Employee"), [employees]);
  const location = useCallback(() => deriveSingular(locations(), "Location"), [locations]);
  const shift = useCallback(() => deriveSingular(shifts(), "Shift"), [shifts]);
  const audit = useCallback(() => deriveSingular(audits(), "Audit"), [audits]);

  // Singular keys stored directly in DB
  const company = useCallback(() => label("company", "Company"), [label]);
  const manager = useCallback(() => label("manager", "Manager"), [label]);
  const owner = useCallback(() => label("owner", "Owner"), [label]);
  const equipment = useCallback(() => label("equipment", "Equipment"), [label]);

  return {
    employee,
    employees,
    location,
    locations,
    shift,
    shifts,
    company,
    audit,
    audits,
    manager,
    owner,
    equipment,
  };
};
