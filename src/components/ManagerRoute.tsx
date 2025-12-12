import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions, CompanyPermission } from "@/hooks/useCompanyPermissions";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

interface ManagerRouteProps {
  children: React.ReactNode;
  requiredPermission?: CompanyPermission;
}

export const ManagerRoute = ({ children, requiredPermission }: ManagerRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: roleData, isLoading: roleLoading, refetch } = useUserRole();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
    queryClient.invalidateQueries({ queryKey: ['company_role_permissions'] });
    refetch();
  };

  // Show loading state while checking auth and roles
  if (authLoading || roleLoading || companyLoading || permissionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is company owner or company admin - they always have access
  const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';
  
  // Check if user has platform manager or admin role
  const hasPlatformRole = roleData?.isManager || roleData?.isAdmin;
  
  // Check if user has the required company permission (if specified)
  const hasRequiredPermission = requiredPermission ? hasPermission(requiredPermission) : false;

  // Allow access if:
  // 1. User is company owner or admin
  // 2. User has platform manager/admin role
  // 3. User has the required company permission (when specified)
  const hasAccess = isOwnerOrAdmin || hasPlatformRole || hasRequiredPermission;

  // Show access denied if no access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need administrator privileges to access this page.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Permissions
            </Button>
            <Button onClick={() => window.location.href = '/dashboard'} variant="default">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};
