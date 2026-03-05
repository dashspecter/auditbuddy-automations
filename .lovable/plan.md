

# Add Owner Info to Company Cards in Platform Admin

## What to do

Show the company owner's name and email on each company card in the "All Companies" list.

## How

### 1. Extend the companies query to fetch owner info

After fetching companies, do a single query on `company_users` (filtered by `company_role = 'company_owner'`) joined with `profiles` to get owner name/email. Merge into company data.

```typescript
// After fetching companies, fetch owners in one query
const { data: owners } = await supabase
  .from('company_users')
  .select('company_id, profiles(full_name, email)')
  .eq('company_role', 'company_owner');

// Map owner to each company
return data.map(c => ({
  ...c,
  owner: owners?.find(o => o.company_id === c.id)?.profiles || null
}));
```

### 2. Update the Company interface

Add `owner?: { full_name: string | null; email: string } | null` to the `Company` interface.

### 3. Display owner in the company card

Add a line below the slug showing owner name/email with a `Shield` or `Users` icon:

```tsx
{company.owner && (
  <div className="flex items-center gap-2">
    <Shield className="h-4 w-4" />
    <span>{company.owner.full_name || 'No name'} — {company.owner.email}</span>
  </div>
)}
```

**1 file changed: `src/pages/PlatformAdmin.tsx`**. No migrations, no new files.

