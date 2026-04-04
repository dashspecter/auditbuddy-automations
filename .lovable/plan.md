

# Fix: Password Not Sent During New Employee Account Creation

## Root Cause

When creating a **new employee** with the "Create login account" checkbox checked, the `create-user` call on line 335-340 sends only `{ email, full_name, employeeId }` — **the password is never included**.

The password input field + "Create Login Account" button only exist in the **edit dialog** path (lines 813-866), not in the new employee creation flow. So when the checkbox is checked during new creation:
1. No password input is shown to the user
2. The backend receives no password and generates `crypto.randomUUID()` as a random one
3. The user has no way to know this password, so login fails with "Invalid credentials"

## Fix — `src/components/EmployeeDialog.tsx`

Two changes needed:

### 1. Show password input when "Create login account" is checked (new employee)

After the checkbox section (~line 785), add a password input that appears when `createUserAccount` is true and `!employee`:

```tsx
{!employee && createUserAccount && (
  <div className="pl-4">
    <Label htmlFor="newEmployeePassword" className="text-sm font-medium">
      Password for Login Account
    </Label>
    <Input
      id="newEmployeePassword"
      type="password"
      placeholder="Enter password (min 6 characters)"
      value={formData.newUserPassword || ''}
      onChange={(e) => setFormData(prev => ({ ...prev, newUserPassword: e.target.value }))}
      className="mt-1"
    />
    <p className="text-xs text-muted-foreground mt-1">
      Minimum 6 characters
    </p>
  </div>
)}
```

### 2. Include password in the create-user call (line 335-340)

Change the body from:
```typescript
body: {
  email: formData.email,
  full_name: formData.full_name,
  employeeId: newEmployee.id
}
```
to:
```typescript
body: {
  email: formData.email,
  full_name: formData.full_name,
  password: formData.newUserPassword || undefined,
  employeeId: newEmployee.id
}
```

### 3. Add validation — require password when creating login account

In `handleSubmit`, right before the `create-user` call (~line 333), add:
```typescript
if (createUserAccount && (!formData.newUserPassword || formData.newUserPassword.length < 6)) {
  toast.error("Password must be at least 6 characters to create a login account");
  return;
}
```

## What does NOT change
- No edge function changes (backend already accepts optional `password`)
- No database changes
- No edit dialog changes (that path already works correctly)
- No auth flow or routing changes

## Result
- New employee creation shows a password field when "Create login account" is checked
- The password is sent to the backend and used for the auth account
- The employee can immediately log in with the email + password they were given

