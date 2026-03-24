

# Fix P2 + Dynamic System Prompt from Registry

## Fix 1 — P2: Add `company_id` to `getCrossModuleSummary` (overview.ts)

Three one-liner additions in `getCrossModuleSummary`:

- **Line 51** (`location_audits`): Add `.eq("company_id", companyId)` after `.select(...)`
- **Line 59** (`corrective_actions`): Add `.eq("company_id", companyId)` after `.select(...)`  
- **Line 71** (`cmms_work_orders`): Add `.eq("company_id", companyId)` after `.select(...)`

`attendance_logs` (line 63) does not have a `company_id` column — it's scoped through `location_id` filter + RLS. No change needed there.

---

## Fix 2 — Feature: Dynamic System Prompt from Registry

Replace the hardcoded "Your Capabilities" section in `buildSystemPrompt()` (lines 664-738) with a function that generates it from `CAPABILITY_REGISTRY`.

### New helper: `generateCapabilityDocs()`

```typescript
function generateCapabilityDocs(): string {
  const sections: string[] = [];
  for (const [domain, cap] of Object.entries(CAPABILITY_REGISTRY)) {
    if (cap.maturity === "planned") continue;
    const label = domain.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const tools = [...cap.reads, ...cap.actions].map(t => `\`${t}\``).join(", ");
    const aliases = cap.aliases.slice(0, 5).join(", ");
    sections.push(`- **${label}** (${cap.maturity}): ${tools}\n  Aliases: ${aliases}`);
  }
  return sections.join("\n");
}
```

### Changes to `buildSystemPrompt()`

Replace the hardcoded reads list (lines 666-675) and the per-domain sections with:

```
## Your Capabilities (auto-generated from registry)

${generateCapabilityDocs()}
```

Keep the **behavioral instructions** that aren't capability declarations (Draft & Execute rules, Approval Rules, Response Guidelines, File Processing rules, Memory instructions). These are orchestration concerns, not capability metadata — they stay hardcoded.

The result: when a new domain is added to `registry.ts`, Dash's prompt automatically includes its tools and aliases without touching `buildSystemPrompt()`.

---

## Files Modified

| File | Change |
|------|--------|
| `capabilities/overview.ts` | Add `.eq("company_id", companyId)` to 3 sub-queries |
| `index.ts` | Import `CAPABILITY_REGISTRY`, add `generateCapabilityDocs()`, replace hardcoded capability list with dynamic generation |
| `registry.ts` | No changes needed (already complete) |

## Deploy

Redeploy `dash-command` edge function after both changes.

