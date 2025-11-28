# Dashspect - Quick Reference

> **TL;DR**: Multi-tenant SaaS for restaurant compliance management. Built with React + Supabase. Everything is company-isolated with role-based access.

## 🎯 What is Dashspect?

Restaurant audit and compliance management platform that helps companies:
- Conduct location audits (hygiene, equipment, compliance)
- Track staff performance
- Manage equipment maintenance
- Store documents securely
- Send notifications to teams
- Generate compliance reports

## 🔑 Key Concepts (60 Second Overview)

### Multi-Tenancy
- Every company has isolated data
- Enforced by `company_id` on all tables
- Row-Level Security (RLS) filters queries automatically
- Users can belong to one company

### Roles (Two Levels)
**Platform Roles** (`user_roles` table):
- `admin` - Platform super admin
- `manager` - Creates audits, manages team
- `checker` - Conducts audits, reads data

**Company Roles** (`company_users` table):
- `company_owner` - Controls company settings
- `company_admin` - Manages company
- `company_member` - Standard user

### Module System
Features are modular and can be enabled/disabled per company:
- Location Audits ✅
- Staff Audits
- Equipment Management
- Documents
- Testing & Training
- Notifications
- Manual Metrics
- Reports

Controlled by `company_modules` table and subscription tier.

## 📂 Quick File Reference

```
src/
├── pages/           # All route handlers (Dashboard, Audits, Reports, etc.)
├── components/      # Reusable UI (Header, Modals, Forms, etc.)
│   ├── ui/          # shadcn components (Button, Card, Dialog, etc.)
│   └── dashboard/   # Dashboard-specific components
├── hooks/           # Data fetching (useAudits, useCompany, etc.)
├── contexts/        # Global state (AuthContext, CompanyContext)
├── lib/             # Utils (utils.ts, constants.ts, pdfExport.ts)
└── integrations/    # Supabase client (auto-generated)

supabase/
├── functions/       # Edge functions (serverless backend)
└── migrations/      # Database migrations (auto-managed)
```

## 🚀 Common Tasks

### Add a New Page
1. Create `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Header.tsx`

### Add a Database Table
1. Create migration with `company_id` column
2. Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
3. Create policies using helper functions
4. Create hook in `src/hooks/useMyData.ts`

### Fetch Data
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyData = () => {
  return useQuery({
    queryKey: ['my_data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*');
      if (error) throw error;
      return data;
    }
  });
};
```

### Protect a Route
```typescript
// Admin only
<Route path="/admin" element={
  <AdminRoute>
    <AdminPage />
  </AdminRoute>
} />

// Manager or Admin
<Route path="/manage" element={
  <ManagerRoute>
    <ManagerPage />
  </ManagerRoute>
} />

// Authenticated users
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## 🎨 Design System Quick Reference

### Colors (Use semantic tokens, not direct values!)
```tsx
// ✅ DO: Use semantic tokens
<div className="bg-primary text-primary-foreground">
<div className="bg-card text-card-foreground">
<div className="text-muted-foreground">

// ❌ DON'T: Use direct colors
<div className="bg-orange-500 text-white">
```

### Common Patterns
```tsx
// Status badges
<Badge className="bg-success">Completed</Badge>
<Badge className="bg-warning">Pending</Badge>
<Badge className="bg-destructive">Failed</Badge>

// Loading state
{isLoading && <Skeleton className="h-20 w-full" />}

// Error state
{error && <Alert variant="destructive">{error.message}</Alert>}

// Button variants
<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
```

## 🔒 Security Checklist

When adding features, always verify:
- [ ] RLS policies created for new tables
- [ ] Company data filtered by `company_id`
- [ ] Permissions checked with `has_role()` or `has_company_role()`
- [ ] Input validated (zod schemas)
- [ ] Error handling implemented
- [ ] No secrets in client code

## 🐛 Debugging

### Check User Role
```typescript
const { data: roleData } = useUserRole();
console.log('Roles:', roleData);
// { isAdmin: false, isManager: true, isChecker: false, roles: ['manager'] }
```

### Check Company & Modules
```typescript
const { company, hasModule } = useCompanyContext();
console.log('Company:', company);
console.log('Has equipment module:', hasModule('equipment_management'));
```

### Check RLS Policies
```sql
-- View policies for a table
SELECT * FROM pg_policies WHERE tablename = 'location_audits';
```

### Common Errors

**"Row level security policy"**
- RLS policy blocking access
- Check user's company_id matches data
- Verify role permissions

**"Module not available"**
- Module not enabled in `company_modules`
- Check subscription tier allows module

**"null is not an object"**
- Data not loaded yet (add loading state)
- Check query is enabled: `enabled: !!userId`

## 📊 Database Schema (Simplified)

```
companies
  └── company_users (membership + company_role)
       └── profiles (user data)
            └── user_roles (platform_role)

locations (physical stores)
  └── location_audits
  └── equipment
       └── equipment_interventions

employees
  └── staff_audits

notifications
audit_templates
documents
```

## 🔄 Data Flow

```
User Action
  ↓
Component uses hook (useAudits)
  ↓
React Query checks cache
  ↓
If stale → Supabase client
  ↓
RLS filters by company_id + role
  ↓
Data returned & cached
  ↓
Component re-renders
```

## 📚 Full Documentation

- **[README.md](./README.md)** - Complete setup & development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep technical documentation
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history

## 💡 Pro Tips

1. **Use constants** - Import from `src/lib/constants.ts` instead of magic strings
2. **Mobile-first** - Design for mobile, enhance for desktop
3. **Loading states** - Always show something while data loads
4. **Error handling** - Wrap API calls in try/catch, show user-friendly messages
5. **Type safety** - Define interfaces for data structures
6. **Reusable components** - Extract repeated UI into components
7. **React Query** - Let it handle caching, don't duplicate in useState

## 🆘 Need Help?

1. Check this document first
2. Read [README.md](./README.md) for detailed explanations
3. Search existing code for similar patterns
4. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
5. Review [Supabase docs](https://supabase.com/docs) for database questions

---

**Last Updated**: January 2025  
**For**: Dashspect v1.0.0
