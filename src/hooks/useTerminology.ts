import { useLabels } from "@/hooks/useLabels";
import { useCallback } from "react";

/**
 * Centralized terminology hook. Returns singular/plural terms
 * that respect company_label_overrides (e.g. "Employees" → "Civil Servants").
 * Non-overridden companies see the defaults — zero visual change.
 */
export const useTerminology = () => {
  const { label } = useLabels();

  const employee = useCallback(() => label("employee", "Employee"), [label]);
  const employees = useCallback(() => label("employees", "Employees"), [label]);
  const location = useCallback(() => label("location", "Location"), [label]);
  const locations = useCallback(() => label("locations", "Locations"), [label]);
  const shift = useCallback(() => label("shift", "Shift"), [label]);
  const shifts = useCallback(() => label("shifts", "Shifts"), [label]);
  const company = useCallback(() => label("company", "Company"), [label]);
  const audit = useCallback(() => label("audit", "Audit"), [label]);
  const audits = useCallback(() => label("audits", "Audits"), [label]);

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
  };
};
