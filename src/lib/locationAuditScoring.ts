import type { AuditFieldLite } from "@/hooks/useAuditTemplateFields";

type CustomData = Record<string, any> | null | undefined;

const isBinaryField = (t: string) => t === "yes_no" || t === "yesno" || t === "checkbox";

/**
 * Computes a percent score (0-100) from template fields + custom_data.
 * Returns null when it cannot compute (no fields / no custom_data).
 */
export function computeLocationAuditPercent(
  fields: AuditFieldLite[] | undefined,
  customData: CustomData
): number | null {
  if (!fields || fields.length === 0) return null;
  if (!customData) return null;

  let score = 0;
  let max = 0;

  for (const f of fields) {
    const value = customData[f.id];

    if (f.field_type === "rating") {
      max += 5;
      if (value !== undefined && value !== null && value !== "") {
        score += Number(value);
      }
      continue;
    }

    if (isBinaryField(f.field_type)) {
      max += 1;
      if (value === "yes" || value === true) score += 1;
      continue;
    }
  }

  if (max <= 0) return null;
  return Math.round((score / max) * 100);
}
