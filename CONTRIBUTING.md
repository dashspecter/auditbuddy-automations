# Contributing to Dashspect

Thank you for your interest in contributing to Dashspect! This document provides guidelines and best practices for contributing to the codebase.

## 🎯 Core Principles

### 1. **Security First**
- Never compromise on Row-Level Security (RLS)
- Always validate permissions server-side
- Test with multiple roles before submitting
- Follow the principle of least privilege

### 2. **Multi-Tenancy Awareness**
- All new tables must include `company_id`
- Always filter queries by company
- Test data isolation between companies
- Use helper functions: `get_user_company_id()`, `has_role()`, `has_company_role()`

### 3. **User Experience**
- Mobile-first responsive design
- Touch-friendly interfaces (44px min tap targets)
- Loading states for all async operations
- Clear error messages
- Optimistic UI updates where appropriate

### 4. **Code Quality**
- TypeScript strict mode
- Consistent naming conventions
- Reusable components and hooks
- Proper error handling
- Meaningful comments for complex logic

## 📋 Before You Start

### Prerequisites
1. Read [README.md](./README.md) - Understand the architecture
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into technical design
3. Set up local development environment
4. Familiarize yourself with the tech stack:
   - React 18 + TypeScript
   - Tailwind CSS + shadcn/ui
   - TanStack Query
   - Supabase (Auth, Database, Storage, Edge Functions)

### Setting Up
```bash
# Clone the repository
git clone <repo-url>
cd dashspect

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔄 Development Workflow

### 1. **Pick an Issue**
- Check existing issues on GitHub
- Comment on the issue you want to work on
- Wait for assignment to avoid duplicate work
- For new features, create an issue first for discussion

### 2. **Create a Branch**
```bash
# Branch naming convention:
# feature/description
# bugfix/description
# refactor/description
# docs/description

git checkout -b feature/add-export-functionality
```

### 3. **Make Changes**

#### Code Style
Follow the established patterns:

```typescript
// Component structure
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface MyComponentProps {
  title: string;
  onSave?: () => void;
}

export default function MyComponent({ title, onSave }: MyComponentProps) {
  // 1. Hooks (context, queries, mutations, state, effects)
  const { user } = useAuth();
  const { data, isLoading } = useQuery(...);
  const [localState, setLocalState] = useState();
  
  useEffect(() => {
    // Side effects
  }, []);
  
  // 2. Event handlers
  const handleClick = () => {
    // Logic
  };
  
  // 3. Early returns
  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;
  
  // 4. Render
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Button onClick={handleClick}>Save</Button>
    </div>
  );
}
```

#### Naming Conventions
- **Components**: `PascalCase` (UserProfile.tsx)
- **Hooks**: `camelCase` with "use" prefix (useAudits.ts)
- **Utilities**: `camelCase` (formatDate.ts)
- **Types**: `PascalCase` (interface AuditData {})
- **Constants**: `UPPER_SNAKE_CASE` (MAX_FILE_SIZE)
- **CSS classes**: Use Tailwind, semantic tokens from design system

#### File Organization
```
src/
├── components/
│   ├── ui/              # shadcn components (don't edit)
│   ├── dashboard/       # Dashboard-specific
│   └── MyComponent.tsx  # Shared components
├── pages/
│   └── MyPage.tsx       # Route handlers
├── hooks/
│   └── useMyData.ts     # Custom hooks
├── lib/
│   ├── utils.ts         # Utilities
│   └── constants.ts     # Constants
```

### 4. **Database Changes**

If your feature requires database changes:

```sql
-- Always include:
-- 1. company_id for multi-tenancy
-- 2. timestamps (created_at, updated_at)
-- 3. created_by for audit trail
-- 4. Enable RLS
-- 5. Create appropriate policies

CREATE TABLE my_new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Your columns
  name text NOT NULL,
  status text DEFAULT 'active'
);

-- Enable RLS (REQUIRED!)
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users view own company data"
  ON my_new_table FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert"
  ON my_new_table FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id(auth.uid()) AND
    has_role(auth.uid(), 'manager')
  );

-- Auto-update timestamp
CREATE TRIGGER update_my_new_table_updated_at
  BEFORE UPDATE ON my_new_table
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

### 5. **Testing Checklist**

Before submitting, verify:

#### Functionality
- [ ] Feature works as intended
- [ ] No console errors or warnings
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Form validation works
- [ ] Success messages appear

#### Security
- [ ] RLS policies tested with different users
- [ ] Company data isolation verified
- [ ] Role-based access control works
- [ ] No SQL injection vulnerabilities
- [ ] Input sanitization implemented

#### Multi-Role Testing
Test with all three platform roles:
- [ ] Admin: Full access
- [ ] Manager: Create/manage operations
- [ ] Checker: Read-only/limited operations

#### Responsive Design
- [ ] Desktop (1920px, 1440px, 1024px)
- [ ] Tablet (768px)
- [ ] Mobile (375px, 414px)
- [ ] Touch targets minimum 44px
- [ ] No horizontal scroll on mobile

#### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 6. **Commit Your Changes**

Follow conventional commit format:

```bash
# Format: <type>(<scope>): <description>

git commit -m "feat(audits): add PDF export functionality"
git commit -m "fix(auth): resolve session timeout issue"
git commit -m "refactor(hooks): consolidate data fetching logic"
git commit -m "docs: update API documentation"
git commit -m "style(ui): improve button hover states"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `style`: Formatting, UI/CSS
- `test`: Adding tests
- `chore`: Maintenance tasks

### 7. **Create a Pull Request**

#### PR Title
Use the same format as commits:
```
feat(audits): Add PDF export functionality
```

#### PR Description Template
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Code follows style guidelines
- [ ] Added/updated tests
- [ ] Tested with all user roles
- [ ] Mobile responsive
- [ ] No console errors
- [ ] RLS policies added for new tables
- [ ] Documentation updated

## Testing
Describe how you tested this:
1. Step 1
2. Step 2
3. Step 3

## Screenshots
If applicable, add screenshots of:
- Desktop view
- Mobile view
- Different states (loading, error, success)

## Database Changes
- [ ] No database changes
- [ ] Migration included
- [ ] RLS policies added

## Related Issues
Closes #123
```

## 🔍 Code Review Process

### What Reviewers Look For

1. **Security**
   - RLS policies present and correct
   - No hardcoded credentials
   - Input validation implemented
   - Authorization checks in place

2. **Architecture**
   - Follows existing patterns
   - Proper separation of concerns
   - Reusable components
   - No circular dependencies

3. **Code Quality**
   - TypeScript types defined
   - Error handling implemented
   - No unused imports/variables
   - Meaningful variable names

4. **UX/UI**
   - Consistent with design system
   - Loading states present
   - Error messages clear
   - Mobile responsive

### Addressing Feedback
- Respond to all comments
- Ask for clarification if needed
- Make requested changes in new commits
- Mark conversations as resolved once addressed

## 🚫 Common Mistakes to Avoid

### 1. **Skipping RLS**
```sql
-- ❌ WRONG: No RLS
CREATE TABLE my_table (...);

-- ✅ CORRECT: Always enable RLS
CREATE TABLE my_table (...);
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON my_table ...;
```

### 2. **Missing company_id**
```typescript
// ❌ WRONG: Missing company filter
const { data } = await supabase
  .from('audits')
  .select('*');

// ✅ CORRECT: Always filter by company
const { data } = await supabase
  .from('audits')
  .select('*')
  .eq('company_id', companyId);
```

### 3. **Hardcoding Values**
```typescript
// ❌ WRONG: Magic strings
if (status === 'active') { }

// ✅ CORRECT: Use constants
import { EQUIPMENT_STATUS } from '@/lib/constants';
if (status === EQUIPMENT_STATUS.ACTIVE) { }
```

### 4. **Poor Error Handling**
```typescript
// ❌ WRONG: Silent failure
const { data } = await supabase.from('audits').select('*');

// ✅ CORRECT: Handle errors
const { data, error } = await supabase.from('audits').select('*');
if (error) {
  console.error('Failed to load audits:', error);
  toast.error('Failed to load audits. Please try again.');
  throw error;
}
```

### 5. **Missing Loading States**
```typescript
// ❌ WRONG: No loading feedback
return <div>{data.map(...)}</div>;

// ✅ CORRECT: Show loading state
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <div>{data.map(...)}</div>;
```

## 📚 Resources

### Internal Documentation
- [README.md](./README.md) - Getting started
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive
- [CHANGELOG.md](./CHANGELOG.md) - Version history

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## 💬 Getting Help

### Where to Ask
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Request Comments**: Specific code questions

### Communication Guidelines
- Be respectful and constructive
- Provide context and examples
- Include error messages and screenshots
- Search existing issues first
- Use proper markdown formatting

## 📝 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Dashspect! Your efforts help make this platform better for everyone. 🚀
