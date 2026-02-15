import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions, CompanyPermission } from '@/hooks/useCompanyPermissions';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

interface PermissionRouteProps {
  children: ReactNode;
  permission: CompanyPermission;
}

/**
 * Route wrapper that checks for a specific company permission.
 * Platform admins and company owners/admins always have access.
 * Redirects to dashboard if the user doesn't have the required permission.
 */
export const PermissionRoute = ({ children, permission }: PermissionRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Show loading skeleton while checking
  if (authLoading || companyLoading || permissionsLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Platform admins always have access
  const isPlatformAdmin = roleData?.isAdmin;
  // Company owners and admins always have access
  const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';

  // Check permission - bypass for elevated roles
  if (!isPlatformAdmin && !isOwnerOrAdmin && !hasPermission(permission)) {
    return (
      <ProtectedLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page. 
            Contact your company administrator to request access.
          </p>
        </div>
      </ProtectedLayout>
    );
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};
