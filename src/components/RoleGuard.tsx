import { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions, CompanyPermission } from "@/hooks/useCompanyPermissions";
import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface RoleGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
  requiredPermission?: CompanyPermission;
  fallbackMessage?: string;
}

/**
 * RoleGuard checks user roles and company permissions, displays access denied if not permitted.
 * Used inside pages that are already wrapped in ProtectedLayout.
 */
export const RoleGuard = ({
  children,
  requireAdmin = false,
  requireManager = false,
  requiredPermission,
  fallbackMessage = "You don't have permission to access this page.",
}: RoleGuardProps) => {
  const { data: roleData, isLoading, error, refetch } = useUserRole();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const queryClient = useQueryClient();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
    queryClient.invalidateQueries({ queryKey: ['company_role_permissions'] });
    refetch();
  };

  // Loading state
  if (isLoading || companyLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Permissions</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>We couldn't verify your access permissions. Please try again.</p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user is company owner or admin - they always have access
  const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';
  
  // Check platform roles
  const hasPlatformAccess =
    (requireAdmin && roleData?.isAdmin) ||
    (requireManager && (roleData?.isManager || roleData?.isAdmin));
  
  // Check company permission if specified
  const hasCompanyPermission = requiredPermission ? hasPermission(requiredPermission) : false;

  // Determine overall access
  const hasAccess =
    isOwnerOrAdmin ||
    hasPlatformAccess ||
    hasCompanyPermission ||
    (!requireAdmin && !requireManager && !requiredPermission);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{fallbackMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
