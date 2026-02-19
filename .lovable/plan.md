
## Understanding CA Rules + Adding "Test Fail" Trigger

### What the CA Rules System Does Today

CA Rules automatically create a Corrective Action (CA) when something goes wrong — so nothing slips through. There are currently 3 trigger types:

- **Audit Failure** — fires when an audit/checklist is submitted with a failing score
- **Incident Repeat** — fires when the same incident type is logged X times within Y days
- **Asset Downtime Pattern** — fires when a piece of equipment breaks down X times within Y days

**The "employee fails a test → reassign in 7 days" scenario does not exist yet.** The CA Rules system today has no `test_fail` trigger type. To handle this, we need to add a new trigger type to the system.

---

### How to Configure a Rule — The Order

Here is the correct order when creating any CA rule:

```text
Step 1 — Rule Name
  Give it a clear name.
  Example: "Failed Test — Retake in 7 Days"

Step 2 — Trigger Type
  Choose WHAT causes the CA to be created.
  (For test failures, this would be a new "Test Failure" trigger we build)

Step 3 — Severity
  How urgent is it?
  Low → 7 days SLA | Medium → 72h | High → 24h | Critical → 4h + Stop-the-Line

Step 4 — Due Within (hours)
  The whole CA must be resolved within this time.
  For a 7-day retake: set to 168 hours (7 × 24).

Step 5 — Action Items (Bundle)
  What tasks get auto-created and assigned?
  For test retake: one item — "Retake [Test Name]"
    - Assigned to role: Staff (the failing employee's role)
    - Due: 168 hours
    - Evidence required: Yes (their new test result)

Step 6 — Save & Enable
  Toggle the rule ON. It will now fire automatically.
```

---

### The Gap: "Test Fail" Trigger Doesn't Exist Yet

The current system supports `audit_fail`, `incident_repeat`, and `asset_downtime_pattern`. There is no `test_fail` trigger. To support your use case, we need to:

1. **Add `test_fail` as a new trigger type** in the CA Rules builder UI (in `CorrectiveActionRules.tsx`)
2. **Add a `TestFailConfig` form** with fields for: which test (or "any"), pass threshold, severity, due hours, and bundle items
3. **Hook it into the `process-capa-rules` edge function** so when a test submission is saved with `passed = false`, it calls the edge function with `trigger_type: "test_fail"`
4. **Wire the call** from the test submission flow (in `useTestSubmissions` or wherever scores are written to `test_submissions`) to trigger the rules engine

---

### Technical Plan

**Files to change:**

- `src/hooks/useCorrectiveActions.ts` — add `"test_fail"` to the `trigger_type` union type
- `src/pages/correctiveActions/CorrectiveActionRules.tsx`
  - Add `"test_fail"` to `TRIGGER_LABELS`
  - Add `TestFailConfig` interface (fields: `test_id?: string`, `severity`, `due_hours`, `bundle`)
  - Add `DEFAULT_TEST_FAIL` config preset (severity: low, due_hours: 168, bundle: one "Retake test" item)
  - Add `TestFailForm` component with a dropdown to pick a specific test or "any test"
  - Render the form in the switch when `triggerType === "test_fail"`
- `supabase/functions/process-capa-rules/index.ts` — extend the handler to recognize `trigger_type: "test_fail"` context shape: `{ test_submission_id, test_id, test_title, employee_id, location_id, score, pass_threshold }`
- A new hook or update to wherever test submissions are created — after `passed === false` is recorded, call `process-capa-rules` with the test_fail context

**No new database migrations needed** — the `corrective_action_rules.trigger_type` column is already `TEXT` (no enum constraint), so `"test_fail"` can be stored freely.

---

### What the Final Flow Looks Like

```text
Employee submits test → scored below pass threshold
      ↓
test submission saved: passed = false
      ↓
Client calls process-capa-rules edge function
  { trigger_type: "test_fail", context: { test_id, test_title, employee_id, location_id, score } }
      ↓
Edge function finds matching enabled rules with trigger_type = "test_fail"
      ↓
Creates CA with:
  - Title: "[Auto] Failed Test: Food Safety — corrective action required"
  - Severity: Low
  - Due: 168h (7 days)
  - Action item: "Retake Food Safety Test" assigned to Staff role
      ↓
Employee and manager see the CA in their queue
```
