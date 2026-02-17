import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserTemplatePermissions } from "@/hooks/useUserTemplatePermissions";

interface RoleBasedViewProps {
  admin?: ReactNode;
  manager?: ReactNode;
  checker?: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders different views based on the user's role.
 * Supports both legacy platform roles AND role template assignments.
 * 
 * Priority:
 * 1. Platform admin → admin view
 * 2. Platform manager OR template with management permissions → manager view
 * 3. Platform checker OR template with audit-only permissions → checker view
 * 4. Fallback
 */
export const RoleBasedView = ({ admin, manager, checker, fallback }: RoleBasedViewProps) => {
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { data: templatePermissions, isLoading: templateLoading } = useUserTemplatePermissions();

  if (roleLoading || templateLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Platform admin always gets admin view
  if (roleData?.isAdmin && admin) {
    return <>{admin}</>;
  }

  // Platform manager gets manager view
  if (roleData?.isManager && manager) {
    return <>{manager}</>;
  }

  // Platform checker gets checker view
  if (roleData?.isChecker && checker) {
    return <>{checker}</>;
  }

  // Template-based view selection (for users without platform roles)
  if (templatePermissions && templatePermissions.length > 0) {
    // Check if template has broad management permissions (employees + shifts + locations)
    const hasManagementPerms = ['employees', 'shifts', 'locations'].every(resource =>
      templatePermissions.some(p => p.resource === resource && p.granted)
    );
    if (hasManagementPerms && manager) {
      return <>{manager}</>;
    }

    // Check if template has audit-only permissions
    const hasAuditPerms = templatePermissions.some(
      p => p.resource === 'audits' && p.granted
    );
    if (hasAuditPerms && checker) {
      return <>{checker}</>;
    }

    // Has some template but doesn't match above → show manager if available
    if (manager) {
      return <>{manager}</>;
    }
  }

  return <>{fallback}</>;
};
