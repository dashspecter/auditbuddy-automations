import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: company, isLoading: companyLoading, error: companyError, refetch } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Debug logging
  console.log('[ProtectedRoute] Render:', {
    authLoading,
    companyLoading,
    hasUser: !!user,
    hasCompany: !!company,
    pathname: location.pathname,
    loadingTimeout,
    errorMessage: companyError?.message
  });

  // Don't check for company on onboarding or module selection routes  
  const isOnboardingRoute = location.pathname.startsWith('/onboarding') || 
                           location.pathname === '/module-selection';

  // Add timeout to prevent infinite loading
  useEffect(() => {
    console.log('[ProtectedRoute] Timeout effect:', { companyLoading, isOnboardingRoute });
    if (companyLoading && !isOnboardingRoute) {
      console.log('[ProtectedRoute] Setting 10 second timeout');
      const timer = setTimeout(() => {
        console.error('[ProtectedRoute] ⚠️ LOADING TIMEOUT REACHED - forcing error state');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => {
        console.log('[ProtectedRoute] Clearing timeout');
        clearTimeout(timer);
      };
    }
  }, [companyLoading, isOnboardingRoute]);

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

  // Show loading timeout error
  if (loadingTimeout || (companyError && !isOnboardingRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading Error</h2>
          <p className="text-muted-foreground mb-4">
            {loadingTimeout 
              ? "The application is taking too long to load. This might be a connection issue."
              : `Error: ${companyError?.message}`}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              setLoadingTimeout(false);
              refetch();
            }}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  // Don't wrap onboarding pages in ProtectedLayout (they have their own layouts)
  if (isOnboardingRoute || location.pathname === '/pending-approval') {
    return <>{children}</>;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};
