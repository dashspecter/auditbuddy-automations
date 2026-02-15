import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

interface CompanyAdminRouteProps {
  children: ReactNode;
}

export const CompanyAdminRoute = ({ children }: CompanyAdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['company'] });
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
  };

  // Platform admin always has access
  const isPlatformAdmin = roleData?.isAdmin;
  const isCompanyAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';

  // Show loading state while checking auth and company
  if (authLoading || companyLoading || roleLoading) {
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

  // Show access denied if not company admin and not platform admin
  if (!isCompanyAdmin && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need company owner or admin privileges to access this page.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Permissions
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="default">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};
