# Dashspect Architecture Documentation

## System Overview

Dashspect is a multi-tenant SaaS platform built with a clear separation between frontend presentation and backend data/business logic. The architecture emphasizes security, scalability, and maintainability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Pages      │  │  Components  │  │     Contexts     │ │
│  │  (Routes)    │  │   (UI)       │  │  (Global State)  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                  │                    │           │
│         └──────────────────┴────────────────────┘           │
│                           │                                 │
│                  ┌────────┴────────┐                        │
│                  │  Custom Hooks   │                        │
│                  │ (Data Layer)    │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │  Supabase Client  │
                  └─────────┬─────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                  Backend (Supabase)                          │
│  ┌────────────────────────┴──────────────────────────────┐ │
│  │                  PostgreSQL Database                   │ │
│  │  ┌───────────┐  ┌────────────┐  ┌─────────────────┐ │ │
│  │  │   Tables   │  │  RLS       │  │  Functions &    │ │ │
│  │  │  (Data)    │  │  Policies  │  │  Triggers       │ │ │
│  │  └───────────┘  └────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │   Auth System      │  │   Edge Functions (Serverless)  │ │
│  │   (JWT tokens)     │  │   - Scheduled jobs             │ │
│  └────────────────────┘  │   - External API integration   │ │
│                          │   - Complex business logic     │ │
│  ┌────────────────────┐  └────────────────────────────────┘ │
│  │  Storage Buckets   │                                     │
│  │  (Files/Photos)    │                                     │
│  └────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Model

### Company Isolation Strategy

Every company's data is isolated through:

1. **company_id column** on all tenant-specific tables
2. **Row-Level Security (RLS) policies** that filter by company_id
3. **Helper functions** to get user's company: `get_user_company_id(auth.uid())`

```sql
-- Example RLS Policy
CREATE POLICY "Users can view their company's locations"
ON locations FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));
```

### User-Company Relationship

```
┌──────────────┐
│  auth.users  │  (Supabase managed)
└──────┬───────┘
       │
       │ 1:1
       │
┌──────▼───────┐
│   profiles   │  (User profile data)
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────────┐
│  user_roles      │  (Platform roles: admin, manager, checker)
└──────────────────┘

       │ 1:N
       │
┌──────▼───────────┐
│  company_users   │  (Company membership + company_role)
└──────┬───────────┘
       │
       │ N:1
       │
┌──────▼───────┐
│  companies   │  (Tenant organizations)
└──────────────┘
```

## Role-Based Access Control (RBAC)

### Two-Level Role System

**Platform Roles** (user_roles table):
- Scope: Entire platform
- Checked via: `has_role(user_id, 'admin')`
- Roles:
  - `admin` - Full platform access, can manage any company
  - `manager` - Can create audits, manage teams
  - `checker` - Basic user, conducts audits

**Company Roles** (company_users.company_role):
- Scope: Within specific company
- Checked via: `has_company_role(user_id, 'company_owner')`
- Roles:
  - `company_owner` - Full control of company settings
  - `company_admin` - Manage company users and data
  - `company_member` - Standard company member

### Access Control Pattern

```typescript
// Frontend route protection
<AdminRoute>              // Requires 'admin' platform role
  <UserManagement />
</AdminRoute>

<ManagerRoute>            // Requires 'manager' or 'admin'
  <Notifications />
</ManagerRoute>

<CompanyAdminRoute>       // Requires company_owner/company_admin
  <CompanySettings />
</CompanyAdminRoute>
```

```sql
-- Backend RLS policy example
CREATE POLICY "Managers can create audits"
ON location_audits FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'))
);
```

## Module System Architecture

### Purpose
Enable/disable features per company based on subscription tier

### Structure

```
companies table
  ├── subscription_tier (free, starter, professional, enterprise)
  └── id

company_modules table
  ├── company_id
  ├── module_name
  ├── is_active (boolean)
  └── activated_at

config/pricingTiers.ts
  └── TIER_MODULES mapping
      ├── free: ['location_audits', 'reports']
      ├── starter: [..., 'staff_audits', 'documents']
      └── ...
```

### Module Access Flow

```typescript
// 1. Frontend: Check if module is available
const { canAccessModule } = useCompanyContext();

if (!canAccessModule('equipment_management')) {
  return <UpgradePrompt />;
}

// 2. Route protection
<ModuleGuard moduleName="equipment_management">
  <EquipmentList />
</ModuleGuard>

// 3. Backend: Verify in RLS policy
CREATE POLICY "Equipment requires module"
ON equipment FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) AND
  company_has_module(company_id, 'equipment_management')
);
```

## Data Flow Patterns

### Read Operations

```
User Action
    ↓
Component calls hook (useAudits)
    ↓
React Query checks cache
    ↓
If stale, calls Supabase client
    ↓
Supabase applies RLS policies
    ↓
Returns filtered data
    ↓
React Query caches result
    ↓
Component renders
```

### Write Operations

```
User submits form
    ↓
Validation (react-hook-form + zod)
    ↓
Mutation hook (useMutation)
    ↓
Optimistic update (immediate UI feedback)
    ↓
Supabase INSERT/UPDATE
    ↓
RLS policies check permissions
    ↓
Database triggers (e.g., update timestamps)
    ↓
On success: invalidate queries
    ↓
React Query refetches data
    ↓
UI updates with real data
```

## Authentication Flow

```
┌─────────────────┐
│  User visits    │
│  /auth page     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Auth.tsx                       │
│  - Login or Signup form         │
│  - Email + Password validation  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Supabase Auth                  │
│  - Validates credentials        │
│  - Creates/updates auth.users   │
│  - Returns JWT token            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Database Trigger               │
│  handle_new_user()              │
│  - Creates profile record       │
│  - Assigns default role         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  AuthContext updates            │
│  - Sets user state              │
│  - Sets session state           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Redirect to /dashboard         │
│  - ProtectedRoute checks auth   │
│  - Renders appropriate dashboard│
└─────────────────────────────────┘
```

### Session Management

```typescript
// AuthContext pattern
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);

useEffect(() => {
  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
    }
  );

  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

## State Management Strategy

### Global State (React Context)

**AuthContext**: 
- User session data
- Authentication status
- Sign in/out functions

**CompanyContext**:
- Current company data
- Active modules
- Trial status
- Module access functions

### Server State (React Query)

All backend data managed through React Query:
- Automatic caching (5 min default)
- Background refetching
- Optimistic updates
- Devtools for debugging

```typescript
// Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['audits', locationId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('location_audits')
      .select('*')
      .eq('location_id', locationId);
    
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutation pattern
const mutation = useMutation({
  mutationFn: async (newAudit) => {
    const { data, error } = await supabase
      .from('location_audits')
      .insert(newAudit)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['audits'] });
    toast.success('Audit created');
  },
});
```

### Local State

Component-specific state:
- Form inputs (via react-hook-form)
- UI toggles (modals, dropdowns)
- Temporary display data

## Database Schema Patterns

### Common Table Structure

```sql
CREATE TABLE example_table (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  company_id uuid REFERENCES companies(id) NOT NULL,
  
  -- Ownership
  created_by uuid REFERENCES profiles(id) NOT NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Business fields
  name text NOT NULL,
  status text DEFAULT 'active',
  
  -- Metadata (flexible)
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp trigger
CREATE TRIGGER update_example_table_updated_at
  BEFORE UPDATE ON example_table
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

### Audit Trail Pattern

```sql
-- History table for tracking changes
CREATE TABLE example_table_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid REFERENCES example_table(id),
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES profiles(id),
  old_value jsonb,
  new_value jsonb,
  change_type text -- 'created', 'updated', 'deleted'
);

-- Trigger to log changes
CREATE TRIGGER log_example_changes
  AFTER UPDATE ON example_table
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();
```

## Edge Functions Architecture

### Purpose
Handle operations that can't or shouldn't be done client-side:
- Scheduled background jobs
- External API integrations
- Complex business logic
- Operations requiring secrets

### Structure

```
supabase/functions/
├── create-user/           # User creation webhook
├── process-recurring-audits/  # Generate scheduled audits
├── process-recurring-maintenance/  # Generate maintenance tasks
├── process-recurring-notifications/  # Send scheduled notifications
└── check-expired-trials/  # Mark expired trials as paused
```

### Edge Function Pattern

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user (if protected endpoint)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = 
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError) throw authError;

    // Business logic here
    const { data, error } = await supabase
      .from('my_table')
      .select('*');

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

## Performance Optimization

### Frontend Optimizations

**React Query Caching**:
- 5-minute stale time reduces unnecessary requests
- Background refetching keeps data fresh
- Query invalidation on mutations

**Image Optimization**:
- Client-side compression before upload
- Resize to max dimensions (1920x1920)
- Convert to WebP when possible

**Code Splitting**:
- Lazy loading for routes
- Dynamic imports for heavy components
- Tree shaking removes unused code

### Backend Optimizations

**Database Indexes**:
```sql
-- Index frequently queried columns
CREATE INDEX idx_audits_company_id ON location_audits(company_id);
CREATE INDEX idx_audits_location_id ON location_audits(location_id);
CREATE INDEX idx_audits_created_at ON location_audits(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_audits_company_location 
  ON location_audits(company_id, location_id);
```

**Query Optimization**:
- Select only needed columns
- Use pagination for large result sets
- Avoid N+1 queries with proper joins

## Security Architecture

### Defense in Depth

```
Layer 1: Authentication
  ├── JWT tokens (Supabase Auth)
  ├── Session management
  └── Auto token refresh

Layer 2: Authorization (RLS)
  ├── Row-level security policies
  ├── Company isolation
  └── Role-based permissions

Layer 3: Input Validation
  ├── Zod schemas
  ├── React Hook Form
  └── Database constraints

Layer 4: Output Sanitization
  ├── Escape user content
  ├── Prevent XSS
  └── Safe PDF generation

Layer 5: Network Security
  ├── HTTPS only
  ├── CORS configuration
  └── Rate limiting (Supabase)
```

### RLS Policy Patterns

**Read Access**:
```sql
-- Users see only their company's data
CREATE POLICY "Company members can view"
ON table_name FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));
```

**Write Access**:
```sql
-- Only managers can create
CREATE POLICY "Managers can insert"
ON table_name FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) AND
  has_role(auth.uid(), 'manager')
);
```

**Owner-Only Access**:
```sql
-- Users can only update their own records
CREATE POLICY "Users update own records"
ON table_name FOR UPDATE
USING (created_by = auth.uid());
```

## Mobile/PWA Architecture

### Progressive Web App Features

**Service Worker**:
- Offline caching strategy
- Background sync
- Push notifications (future)

**Install Prompt**:
- Detects installability
- Custom install UI
- A2HS (Add to Home Screen)

### Mobile Optimizations

**Touch Interactions**:
- Min 44px tap targets
- Pull-to-refresh lists
- Swipeable actions
- Long-press menus

**Camera Integration**:
```typescript
// Native camera via Capacitor
import { Camera } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.DataUrl,
  source: CameraSource.Camera, // or Prompt for camera/gallery
});
```

**Responsive Design**:
- Mobile-first Tailwind classes
- Safe area insets for notches
- Adaptive navigation (header on desktop, bottom bar on mobile)

---

This architecture document provides a comprehensive overview of Dashspect's technical design. For specific implementation details, refer to the inline code documentation and README.md.
