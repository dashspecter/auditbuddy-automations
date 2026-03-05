

# Fix: Owner info not showing for non-Fresh Brunch companies

## Problem
The owner query uses the Supabase client which goes through RLS. The `company_users` RLS policy restricts visibility to same-company rows only. So the platform admin (logged in as Fresh Brunch) can only see Fresh Brunch's owner — all other companies show no owner.

## Solution
Create a `SECURITY DEFINER` RPC that returns all company owners with their profile info. This function will be restricted to platform admins via an internal role check.

### 1. New DB function (migration)

```sql
CREATE OR REPLACE FUNCTION public.get_all_company_owners()
RETURNS TABLE(company_id uuid, full_name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only platform admins can call this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT cu.company_id, p.full_name, p.email
  FROM company_users cu
  JOIN profiles p ON p.id = cu.user_id
  WHERE cu.company_role = 'company_owner';
END;
$$;
```

### 2. Update `PlatformAdmin.tsx` (lines 70-89)

Replace the two separate queries (company_users + profiles) with one RPC call:

```typescript
const { data: owners } = await supabase.rpc('get_all_company_owners');

return (data || []).map(c => {
  const owner = owners?.find(o => o.company_id === c.id);
  return { ...c, owner: owner ? { full_name: owner.full_name, email: owner.email } : null };
}) as Company[];
```

**1 migration + 1 file edit (`PlatformAdmin.tsx`).**

