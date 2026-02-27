/**
 * Waste product Unit of Measure helpers
 */

export const UOM_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'l', label: 'Liters (L)' },
  { value: 'portions', label: 'Portions' },
] as const;

export type UomValue = typeof UOM_OPTIONS[number]['value'];

export const COST_MODEL_OPTIONS = [
  { value: 'per_kg', label: 'Cost × quantity' },
  { value: 'per_unit', label: 'Fixed cost per unit' },
] as const;

/** Returns true if UOM is count-based (should default to per_unit cost model) */
export function isCountBased(uom: string): boolean {
  return uom === 'pcs' || uom === 'portions';
}

/** Get the input label for a given UOM */
export function getQuantityLabel(uom: string): string {
  switch (uom) {
    case 'kg': return 'Weight (kg)';
    case 'g': return 'Weight (g)';
    case 'pcs': return 'Quantity (pieces)';
    case 'l': return 'Volume (liters)';
    case 'portions': return 'Quantity (portions)';
    default: return 'Weight (kg)';
  }
}

/** Get a short unit suffix for display */
export function getUomSuffix(uom: string): string {
  switch (uom) {
    case 'kg': return 'kg';
    case 'g': return 'g';
    case 'pcs': return 'pcs';
    case 'l': return 'L';
    case 'portions': return 'portions';
    default: return 'kg';
  }
}

/** Get the cost column header label */
export function getCostLabel(uom: string, costModel: string): string {
  if (costModel === 'per_unit') return 'Cost/unit (RON)';
  switch (uom) {
    case 'kg': return 'Cost/kg (RON)';
    case 'g': return 'Cost/g (RON)';
    case 'l': return 'Cost/L (RON)';
    default: return 'Cost/unit (RON)';
  }
}

/** Get placeholder for quantity input */
export function getQuantityPlaceholder(uom: string): string {
  switch (uom) {
    case 'kg': return 'e.g. 1,50';
    case 'g': return 'e.g. 500';
    case 'pcs': return 'e.g. 3';
    case 'l': return 'e.g. 2,5';
    case 'portions': return 'e.g. 4';
    default: return 'e.g. 1,50';
  }
}

/** Should we show the gram conversion tooltip? */
export function showGramTooltip(uom: string): boolean {
  return uom === 'kg';
}
