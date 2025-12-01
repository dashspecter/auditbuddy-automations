import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { data: roleData, isLoading, refetch } = useUserRole();
  const queryClient = useQueryClient();

  console.log('[ManagerRoute] User:', user?.email, 'Loading:', isLoading, 'Role data:', roleData);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    console.log('[ManagerRoute] No user, redirecting to auth');
    return <Navigate to="/auth" />;
  }

  // Allow both managers and admins
  if (!roleData?.isManager && !roleData?.isAdmin) {
    console.log('[ManagerRoute] Access denied - not manager or admin');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Permissions
          </Button>
        </div>
      </div>
    );
  }

  console.log('[ManagerRoute] Access granted');
  return <ProtectedLayout>{children}</ProtectedLayout>;
};
