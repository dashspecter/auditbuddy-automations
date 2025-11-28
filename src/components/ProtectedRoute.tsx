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
      console.log('[ProtectedRoute] Company check:', {
        hasCompany: !!company,
        hasError: !!companyError,
        errorMessage: companyError?.message,
        userId: user.id
      });
      
      // Only redirect if we're absolutely sure there's no company
      // Don't redirect on network errors or other temporary issues
      if (companyError && !company) {
        const errorMessage = companyError?.message || '';
        
        // Don't redirect on temporary/network errors
        if (errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('network') ||
            errorMessage.includes('timeout')) {
          console.log('[ProtectedRoute] Skipping redirect due to network error');
          return;
        }
        
        console.log('[ProtectedRoute] No company found, redirecting to onboarding');
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
