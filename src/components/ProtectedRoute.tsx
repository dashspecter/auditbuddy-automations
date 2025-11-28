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

  // Don't check for company on onboarding or module selection routes  
  const isOnboardingRoute = location.pathname.startsWith('/onboarding') || 
                           location.pathname === '/module-selection';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Only redirect to onboarding if we're certain there's no company
  useEffect(() => {
    if (!authLoading && user && !companyLoading && !isOnboardingRoute && !company) {
      if (companyError) {
        const errorMessage = companyError?.message?.toLowerCase() || '';
        console.log('[ProtectedRoute] Company error:', errorMessage);
        
        // Don't redirect on temporary/network errors
        if (errorMessage.includes('failed to fetch') || 
            errorMessage.includes('network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('jwt')) {
          console.log('[ProtectedRoute] Skipping redirect - temporary error');
          return;
        }
        
        // Only redirect if error clearly indicates no company exists
        if (errorMessage.includes('no company') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('no rows')) {
          console.log('[ProtectedRoute] Redirecting to onboarding - no company found');
          navigate('/onboarding/company', { replace: true });
        }
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
