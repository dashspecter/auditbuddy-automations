import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['company'] });
  };

  const isCompanyAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';

  useEffect(() => {
    if (!authLoading && !companyLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isCompanyAdmin) {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, company, companyLoading, navigate, isCompanyAdmin]);

  if (authLoading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isCompanyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need company owner or admin privileges to access this page.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Permissions
          </Button>
        </div>
      </div>
    );
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};
