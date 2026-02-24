

## Tag Shifts as "Extra" / "Exception"

### What This Solves

Currently, "extra shifts" are detected only by comparing an employee's total shifts against their `expected_shifts_per_week` threshold. This breaks for employees with irregular patterns (e.g., 2-on-2-off) where the weekly count varies. By allowing managers to explicitly tag a shift as "extra" when creating or editing it, the system gets a reliable, intentional signal rather than relying on math that doesn't fit every schedule pattern.

### How It Works

The `shifts` table already has a `shift_type` column with values `'regular'` and `'training'`. We will add `'extra'` as a third option.

- When creating or editing a shift, managers will see a **"Shift Type"** selector with options: Regular, Extra, Training
- Shifts tagged as "extra" will display a distinct visual badge in the scheduling grid
- Payroll will treat `shift_type = 'extra'` shifts as overtime-eligible (using the employee's `overtime_rate`) regardless of the weekly shift count

### Changes

| Area | Change |
|------|--------|
| **EnhancedShiftDialog** | Add a "Shift Type" dropdown (Regular / Extra) to the form. Pre-fill `'regular'` by default. Save the value to `shift_type` on the shift record. |
| **ShiftDialog** (simple version) | Add the same "Shift Type" selector for consistency. |
| **Scheduling Grid** | Show a small colored badge (e.g., orange "Extra") on shifts where `shift_type = 'extra'`. |
| **useShifts hook** | Update the TypeScript type to include `'extra'` in the `shift_type` union. |
| **usePayroll hook** | When `shift_type = 'extra'`, always mark `is_extra_shift = true` and apply overtime rate, bypassing the weekly threshold calculation. |
| **Payroll UI** | Extra-tagged shifts will appear in the "Extra Shifts" section as they already do, but now driven by the explicit tag rather than only by the count-based logic. |

### Technical Details

**No database migration needed** -- the `shift_type` column is already `text` type, so `'extra'` is a valid value without any schema change.

**EnhancedShiftDialog changes:**
- Add `shift_type` to formData state (default: `'regular'`)
- Add a Select dropdown after the existing fields with options: Regular, Extra
- Include `shift_type` in the submit payload
- When editing, pre-fill from the existing shift's `shift_type`

**ShiftDialog changes:**
- Same pattern: add `shift_type` to form state and UI

**EnhancedShiftWeekView (scheduling grid):**
- Check `shift.shift_type === 'extra'` and render a small orange badge alongside the shift chip

**usePayroll.ts changes (around line 274):**
- Before pushing the entry, check if the shift has `shift_type === 'extra'`
- If so, set `is_extra_shift: true` directly instead of deferring to the summary-level weekly calculation
- In the summary aggregation, combine both explicitly-tagged extras and threshold-detected extras

**useShifts.ts type update:**
- Change `shift_type?: 'regular' | 'training' | null` to `shift_type?: 'regular' | 'training' | 'extra' | null`

