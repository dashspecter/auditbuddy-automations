# Dashspect - Restaurant Compliance Management Platform

## 🎯 Overview
Dashspect is a comprehensive SaaS platform for restaurant audit compliance management. It provides multi-tenant support for companies to manage locations, conduct audits, track staff performance, manage equipment maintenance, and ensure regulatory compliance.

**Technology Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase

## 🏗️ Architecture

### Core Concepts
1. **Multi-Tenant Architecture**: Each company has isolated data with row-level security (RLS)
2. **Role-Based Access Control**: Platform roles (Admin, Manager, Checker) + company-specific roles  
3. **Module System**: Features organized into activatable modules per company
4. **Subscription Tiers**: Free, Starter, Professional, Enterprise with feature gating

### Authentication & Multi-Tenancy
- User authentication via Supabase Auth (JWT tokens)
- User profiles in `profiles` table (linked to `auth.users`)
- Platform roles in `user_roles` table
- Company membership in `company_users` table with company-specific roles
- All data tables filtered by `company_id` with RLS policies

### Helper Functions (Supabase)
```sql
get_user_company_id(user_id) - Returns user's company ID
has_role(user_id, role) - Check if user has platform role
has_company_role(user_id, role) - Check company-specific role  
company_has_module(company_id, module) - Verify module access
```

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard-specific components
│   ├── locations/       # Location management 
│   ├── onboarding/      # User onboarding flows
│   ├── settings/        # Settings components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   └── *.tsx            # Shared components (Header, Modals, Guards)
│
├── contexts/
│   ├── AuthContext.tsx      # Authentication state
│   └── CompanyContext.tsx   # Company & module access
│
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Auth operations
│   ├── useCompany.ts    # Company data
│   ├── useAudits.ts     # Audit operations
│   └── ...              # Feature-specific hooks
│
├── integrations/
│   └── supabase/        # Supabase client & types (auto-generated)
│
├── lib/                 # Utility functions
│   ├── utils.ts         # General utilities
│   ├── pdfExport.ts     # PDF generation
│   ├── imageCompression.ts # Image optimization
│   └── recurringScheduleUtils.ts # Scheduling logic
│
├── pages/               # Page components (route handlers)
│   ├── Auth.tsx         # Login/signup
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Index.tsx        # Root route handler
│   └── ...              # Feature pages
│
└── config/              # Configuration
    ├── pricingTiers.ts  # Subscription definitions
    └── moduleTours.tsx  # Onboarding tours

supabase/
├── functions/           # Edge functions (serverless backend)
└── migrations/          # Database migrations (auto-managed)
```

## 🔐 Security & Access Control

### Role Hierarchy
```
Platform Roles (user_roles table):
├── admin     - Full platform access, manage all companies
├── manager   - Company management, create/assign audits
└── checker   - Conduct audits, view own reports

Company Roles (company_users table):
├── company_owner  - Full company control
├── company_admin  - Company management
└── company_member - Standard member
```

### Row-Level Security (RLS)
All tables have RLS policies that:
- Filter data by company_id
- Check user roles via helper functions
- Prevent cross-company data access
- Enforce read/write permissions

## 🎨 Design System

### Brand Colors (Orange Theme)
- **Primary**: Orange `hsl(25 95% 53%)` - #F97316
- **Accent**: Blue `hsl(217 91% 60%)` - Secondary color
- **Gradients**: Orange + Blue combinations

### Color Usage (CSS Variables in src/index.css)
- `bg-primary` - Primary orange (buttons, highlights)
- `bg-card` - Card backgrounds
- `text-foreground` - Main text
- `text-muted-foreground` - Secondary text  
- `bg-success`, `bg-warning`, `bg-destructive` - Status colors

### Component Library
Based on [shadcn/ui](https://ui.shadcn.com) - customizable, accessible components in `src/components/ui/`

## 🧩 Modules & Features

### Core Modules
1. **Location Audits** - Conduct compliance audits at physical locations
2. **Staff Audits** - Evaluate employee performance  
3. **Equipment Management** - Track maintenance & interventions
4. **Document Management** - Store company documents
5. **Testing & Training** - Create/assign employee tests
6. **Notifications** - Send targeted staff notifications
7. **Manual Metrics** - Track custom KPIs
8. **Reports & Analytics** - Generate compliance reports

### Module Access Control
- Enabled per company in `company_modules` table
- Gated by subscription tier (see `src/config/pricingTiers.ts`)
- Check access via `useCompanyContext().canAccessModule(moduleName)`
- Protect routes with `<ModuleGuard moduleName="..." />`

## 🚀 Development Guide

### Local Setup
```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Build for production
```

### Environment Variables (Auto-configured by Lovable Cloud)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`  
- `VITE_SUPABASE_PROJECT_ID`

### Adding a New Page
```typescript
// 1. Create in src/pages/MyNewPage.tsx
import { Header } from "@/components/Header";

export default function MyNewPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Content */}
      </main>
    </div>
  );
}

// 2. Add route in src/App.tsx
<Route path="/my-page" element={
  <ProtectedRoute>
    <MyNewPage />
  </ProtectedRoute>
} />
```

### Adding a Database Table
```sql
-- Create table with company_id for multi-tenancy
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- ... your columns
);

-- Enable RLS (REQUIRED!)
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Create access policies
CREATE POLICY "Users view own company data"
  ON my_table FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert"
  ON my_table FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'manager')
  );
```

### Creating Data Hooks
```typescript
// src/hooks/useMyData.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyData = () => {
  return useQuery({
    queryKey: ['my_data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useCreateMyData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newData) => {
      const { data, error } = await supabase
        .from('my_table')
        .insert(newData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_data'] });
    },
  });
};
```

## 📊 Key Data Models

### Core Tables
- `companies` - Tenant organizations
- `profiles` - User profiles
- `user_roles` - Platform role assignments  
- `company_users` - Company membership + company roles
- `company_modules` - Enabled modules per company
- `locations` - Physical restaurant/store locations

### Audit System
- `audit_templates` - Customizable audit forms
- `audit_sections` - Template sections  
- `audit_fields` - Form fields (text, checkbox, rating, etc.)
- `location_audits` - Completed location audits
- `staff_audits` - Employee performance audits

### Equipment Management
- `equipment` - Equipment inventory
- `equipment_interventions` - Maintenance tasks/logs
- `recurring_maintenance_schedules` - Scheduled maintenance

## 🔄 State Management

### Global State (React Context)
- **AuthContext** - User session, authentication state
- **CompanyContext** - Company data, module access, trial status

### Server State (TanStack Query)
- All API calls via React Query hooks
- Automatic caching (5-min default)
- Optimistic updates for mutations
- Centralized error handling

### Local State
- Component state via `useState`
- Form state via `react-hook-form` + `zod` validation

## 📱 Mobile/PWA Features

### Progressive Web App
- Service worker for offline support
- Installable on mobile devices
- Push notification support (future)
- Camera access for photo capture

### Mobile Optimizations
- Responsive design (mobile-first)
- Touch-friendly UI (44px min tap targets)
- Pull-to-refresh on lists
- Image compression before upload
- Safe area insets for notched devices
- Bottom navigation for thumb reach

### Native Capabilities (via Capacitor)
- Camera API for photo capture
- File system access
- Status bar control
- iOS/Android builds

## 🐛 Debugging

### Debug Tools
- `/admin/debug` - System info (admin only)
- Browser DevTools Console
- React Query DevTools (dev mode)
- Supabase Logs (via Lovable Cloud UI)

### Common Issues

**RLS Policy Errors**
- Symptom: "Permission denied" or empty results
- Fix: Verify user's company_id matches data, check RLS policies

**Module Access Denied**  
- Symptom: "Module not available"
- Fix: Check `company_modules` table, verify subscription tier

**Auth Errors**
- Symptom: Redirected to login unexpectedly
- Fix: Check Supabase session, clear localStorage, verify email confirmation

**Routes 404**
- Symptom: Page not found
- Fix: Ensure route defined in `App.tsx`, check path typos

## 📝 Code Style Guide

### Naming Conventions
- **Components**: PascalCase (`UserAvatar.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useAudits.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase (`interface UserData {}`)
- **Constants**: UPPER_SNAKE_CASE (`const MAX_FILE_SIZE = 5`)

### Component Structure
```typescript
// 1. Imports (grouped: React, libraries, local)
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onSave?: () => void;
}

// 3. Component
export default function MyComponent({ title, onSave }: MyComponentProps) {
  // 4. Hooks (in order: context, queries, mutations, state, effects)
  const { user } = useAuth();
  const { data } = useQuery(...);
  const [state, setState] = useState();
  
  useEffect(() => {
    // Side effects
  }, []);
  
  // 5. Handlers
  const handleClick = () => {
    // Logic
  };
  
  // 6. Early returns
  if (!user) return null;
  
  // 7. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Save</Button>
    </div>
  );
}
```

## 🎯 Performance Best Practices

### Implemented
✅ React Query caching (5-minute stale time)
✅ Image compression before upload
✅ Lazy loading for routes  
✅ Debounced search inputs
✅ Pagination for large lists
✅ Pull-to-refresh instead of auto-refetch

### Guidelines
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Avoid unnecessary re-renders (React.memo for pure components)
- Optimize images (WebP format, proper sizing)
- Use database indexes for frequently queried columns

## 🔒 Security Checklist

### Implemented
✅ Row-Level Security on all tables
✅ JWT authentication
✅ Role-based access control
✅ Company data isolation via company_id
✅ Input validation (react-hook-form + zod)
✅ File upload restrictions

### Security Guidelines
- ❌ Never expose secrets in client code
- ✅ Always validate permissions server-side (RLS policies)
- ✅ Use parameterized queries (Supabase handles this)
- ✅ Sanitize user inputs
- ✅ Regularly audit RLS policies
- ✅ Keep dependencies updated
- ✅ Use HTTPS only in production

## 🤝 Contributing

### Before Changes
1. Understand multi-tenant architecture
2. Review existing RLS policies
3. Test with all roles (admin, manager, checker)
4. Verify mobile responsiveness
5. Check impact on existing features

### Pull Request Checklist
- [ ] Follows code style guide
- [ ] Added RLS policies for new tables
- [ ] Tested with multiple roles
- [ ] Mobile responsive  
- [ ] No console errors
- [ ] Updated README if architecture changed
- [ ] Added inline comments for complex logic

## 📞 Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Lovable Docs](https://docs.lovable.dev)

### Key Decisions
- **Multi-tenant**: Company isolation via RLS from day one
- **Module system**: Flexible pricing & feature access
- **React Query**: Predictable server state management
- **shadcn/ui**: Customizable, accessible components
- **Capacitor**: Future native mobile capabilities

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Built with**: ❤️ by Dashspect Team
