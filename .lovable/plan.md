

# Transform "Test Comp" into a Government Institution

## What needs to happen

Three data operations on the existing company (`546575db-dc0f-409f-8da2-170054b258f6`):

### 1. Update company name and industry
- Rename from "Test Comp" to "Government Institution"
- Change `industry_id` from Hospitality (`96591631-...`) to Government (`1c24d70b-00b2-4fb8-8ef8-9392e94a67d2`)

### 2. Enable the `government_ops` module
- Insert/upsert `government_ops` into `company_modules` with `is_active = true`

### 3. Seed government terminology labels
- Insert 8 label overrides into `company_label_overrides` (Company→Institution, Locations→Departments, Employees→Civil Servants, etc.) — matching the onboarding RPC's government seed logic

All three are **data updates** (no schema changes needed). After these updates, the company will immediately have access to:
- Approval Queue (`/approvals`)
- Executive Dashboard layout
- Terminology Settings with government defaults
- Approval Workflows in Settings

