import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't check for company on onboarding routes
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check if user has a company after auth is loaded (skip for onboarding routes)
  useEffect(() => {
    if (!authLoading && user && !companyLoading && !isOnboardingRoute) {
      // If there's a company error (user not in company_users), redirect to onboarding
      if (companyError) {
        console.log('User has no company, redirecting to onboarding');
        navigate('/onboarding/company');
      }
    }
  }, [user, authLoading, company, companyLoading, companyError, navigate, isOnboardingRoute]);

  if (authLoading || (companyLoading && !isOnboardingRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
