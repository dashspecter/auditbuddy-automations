
## Full Implementation: Audit Field-Level CAPA Rules + Role Resolution

### Summary of Everything Being Built

Three interconnected changes that together form a complete end-to-end system:

1. **Fix: Role resolution in the edge function** — so "Action Required" cards appear on the mobile dashboard for ALL assigned roles, not just test_fail employees
2. **Feature: Audit field-level rule builder** — select a specific audit template, see all its fields, configure per-field thresholds and per-field task bundles with any number of roles
3. **Wire-up: Audit submission triggers the rule engine** — after an audit is submitted, automatically fire the rule engine for every scorable field response

---

### Part 1: Edge Function — Role Resolution (Critical Fix, Affects All Triggers)

**File:** `supabase/functions/process-capa-rules/index.ts`

Currently, for non-test_fail triggers, `assignee_user_id` is always set to `null`. This means the "Action Required" mobile card never appears for audit-triggered CAs.

**Fix:** After creating each bundle item, look up who holds `assignee_role` at the relevant location and populate `assignee_user_id`.

Resolution logic (mirrors what the manual CA creation already does):
```
For each bundle item with an assignee_role:
  1. Check employees table WHERE location_id = locationId AND role ILIKE assignee_role
  2. If no match, check employees table WHERE company_id = companyId AND role ILIKE assignee_role (company-wide fallback)
  3. If still no match, check company_users table WHERE company_id = companyId AND company_role = assignee_role
  4. If found → set assignee_user_id = their user_id
  5. If not found → insert with assignee_user_id = null (item still visible to managers, just not on mobile card)
```

This resolution runs once per bundle item. Multiple items can resolve to different users — each gets their own "Action Required" card.

**For test_fail:** Resolution already works (employee user_id is set directly). No change there.

---

### Part 2: Edge Function — Audit Field Threshold Logic

**File:** `supabase/functions/process-capa-rules/index.ts`

**New context shape for audit_fail field-level calls (sent from LocationAudit.tsx):**
```
{
  audit_id:       string,
  template_id:    string,
  field_id:       string,
  field_name:     string,
  field_type:     "rating" | "yes_no" | "yesno" | "checkbox" | "number",
  response_value: number | string,  ← actual score/answer
  location_id:    string | null,
  source_id:      "audit:{auditId}:field:{fieldId}"   ← dedup key
}
```

**New matching logic in the audit_fail branch:**
```
For each matching rule:
  1. If cfg.template_id exists and != "any":
       skip if context.template_id != cfg.template_id
  2. If cfg.field_rules exists and is non-empty:
       find the fieldRule where field_id == context.field_id AND enabled == true
       if no matching fieldRule → skip this rule (no config for this field)
       evaluate threshold:
         - rating/number: fails if response_value <= threshold
         - yes_no/yesno/checkbox: fails if response_value is "no", false, 0, or "false"
       if threshold NOT met → skip (field passed, no CA needed)
       use fieldRule.bundle for this CA's action items
       use fieldRule's severity if set, else fall back to cfg.severity
  3. Else (global bundle mode, no field_rules):
       proceed as today (existing behavior, unchanged)
```

**Deduplication:** `source_id = "audit:{auditId}:field:{fieldId}"` — if the same audit is re-triggered, no duplicate CAs are created (existing open CA is reused/escalated).

---

### Part 3: Rule Builder UI — AuditFailForm Extended

**File:** `src/pages/correctiveActions/CorrectiveActionRules.tsx`

**New config interface (fully additive — old rules with just `bundle` continue to work):**
```typescript
interface FieldRule {
  field_id: string;
  field_name: string;
  field_type: string;        // "rating", "yes_no", "yesno", "checkbox", "number"
  threshold?: number;        // For rating (1-4) and number fields
  enabled: boolean;
  bundle: BundleItem[];      // Tasks for this specific field's failure
}

interface AuditFailConfig {
  severity: Severity;
  due_hours: number;
  stop_the_line: boolean;
  bundle: BundleItem[];           // Kept — "any audit" global fallback
  template_id?: string;           // NEW — "any" or a specific template UUID
  field_rules?: FieldRule[];      // NEW — per-field threshold + bundle
}
```

**UI Flow for AuditFailForm:**

Step 1 — Global settings (same as today): Severity, Due Hours, Stop-the-Line.

Step 2 — NEW "Apply to" template selector:
- "Any audit" (default — uses global bundle, current behavior)
- Dropdown of all active audit templates for the company

Step 3 — NEW Field Rules Builder (only shown when a specific template is selected):
- Fetches all sections + fields from `audit_sections` + `audit_fields` tables for the selected template
- Renders each **scorable field** (rating, yes_no, yesno, checkbox, number) as a collapsible card:
  - Field name + type badge ("Rating 1–5" / "Yes / No")
  - Enable/disable toggle per field row
  - For `rating`/`number` fields: threshold input — "Trigger if score ≤ __" (default: 3 for rating)
  - For `yes_no`/`checkbox` fields: shows "Triggers on: NO answer" (no threshold input needed)
  - Per-field `BundleEditor` — same existing component, reused as-is
  - Each bundle item supports one role assignment → to assign multiple roles, add multiple bundle items

Text fields (`text`, `date`, `time`, etc.) are skipped — they have no measurable threshold.

**What "multiple roles per field" looks like in practice:**
```
Field: "Fridge Temperature" (rating ≤ 3)
  Bundle item #1: "Check compressor, log reading"  → Store Manager  | 4h | Evidence required
  Bundle item #2: "Escalate if not resolved"         → Area Manager   | 24h | No evidence
```
Both the Store Manager AND the Area Manager get "Action Required" cards because both get their own CA item with their user_id resolved.

**Edit form hydration (`openEdit`):** Extended to hydrate `template_id` and `field_rules` from stored config when opening an existing rule for editing.

**Summary chips (`RuleConfigSummary`):** Extended to show:
- "Template: [template name]" or "Any audit"
- "X field rules" when field_rules are configured

---

### Part 4: Audit Submission Triggers Rule Engine

**File:** `src/pages/LocationAudit.tsx`

**Where:** Inside `handleSubmit`, after the audit is successfully saved to the database (after the `toast.success` and before `navigate(...)`).

**What it does:** Calls `supabase.functions.invoke("process-capa-rules")` once per scorable field that has a response value. Uses `Promise.allSettled` so one field failure never blocks another. Runs silently — any errors are logged but do not break the audit submission flow.

```
After audit saved successfully:
  auditId = currentDraftId OR newAudit.id

  For each section in selectedTemplate.sections:
    For each field in section.fields:
      if field_type in ["rating", "yes_no", "yesno", "checkbox", "number"]:
        value = formData.customData[field.id]
        if value is not null/undefined/"":
          invoke process-capa-rules with:
            trigger_type: "audit_fail"
            context: {
              audit_id: auditId,
              template_id: selectedTemplateId,
              field_id: field.id,
              field_name: field.name,
              field_type: field.field_type,
              response_value: value,
              location_id: formData.location_id || null,
              source_id: `audit:${auditId}:field:${field.id}`
            }

  Promise.allSettled(all invocations) ← non-blocking, fire-and-forget after navigate
```

**Important:** Navigation happens immediately. The CA creation runs in parallel without blocking the auditor's experience. The `toast.success("Audit submitted")` shows instantly; CAs appear in the queue within a few seconds.

---

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/process-capa-rules/index.ts` | Role resolution for all non-test_fail triggers + audit field threshold logic |
| `src/pages/correctiveActions/CorrectiveActionRules.tsx` | Extended `AuditFailConfig` interface, extended `AuditFailForm` with template picker + field rules builder, `openEdit` hydration, summary chips |
| `src/pages/LocationAudit.tsx` | Fire rule engine per scorable field after successful audit submit |

---

### Safety Guarantees

- **Zero schema migration needed** — `trigger_config` is already JSONB, `source_id` is already TEXT
- **Existing audit_fail rules (global bundle mode) are completely unchanged** — the new field-rules path only activates when `field_rules` is present in the stored config
- **test_fail path is untouched** — completely separate code branch
- **Audit submission never blocked** — rule engine calls are fire-and-forget after navigation
- **Deduplication preserved** — `audit:{auditId}:field:{fieldId}` composite key prevents duplicate CAs if re-triggered
- **Role resolution failure is silent** — item created with `assignee_user_id = null` if no matching employee found; still visible to managers in the CA management view

---

### End-to-End Flow After Implementation

```
Manager configures rule:
  Trigger: Audit Failure
  Template: "FOH Daily Checklist"
  Field: "Fridge Temperature" (rating ≤ 3)
    Item 1: "Check compressor" → Store Manager | 4h | evidence required
    Item 2: "Escalate if unresolved" → Area Manager | 24h

Auditor submits "FOH Daily Checklist" at Store 3:
  Fridge Temperature → rated 2/5   ← FAILS (2 ≤ 3)
  Hand hygiene       → rated 5/5   ← passes
  Cleanliness        → No          ← FAILS (is "No")

Background (after navigate, non-blocking):
  Field "Fridge Temp" → rule matches → CA created
    Store Manager at Store 3 → resolved to user John → assignee_user_id = John
    Area Manager at Store 3  → resolved to user Maria → assignee_user_id = Maria

  Field "Cleanliness" → rule matches (if configured) → CA created
    ...same role resolution

John opens mobile → "Action Required" card appears  ✓
Maria opens mobile → "Action Required" card appears ✓
Auditor navigates to summary page instantly — no delay ✓
```
