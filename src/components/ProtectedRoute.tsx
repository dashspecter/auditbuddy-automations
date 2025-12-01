import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Routes that don't need company data
  const isSpecialRoute = location.pathname.startsWith('/onboarding') || 
                         location.pathname === '/pending-approval' ||
                         location.pathname === '/system-health';

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect to onboarding if no company (unless already on special route)
  useEffect(() => {
    if (!authLoading && user && !companyLoading && !isSpecialRoute && !company) {
      if (companyError) {
        const errorMessage = companyError?.message?.toLowerCase() || '';
        
        // Only redirect on clear "no company" errors, not temporary network issues
        if (errorMessage.includes('no company') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('no rows')) {
          navigate('/onboarding/company', { replace: true });
        }
      }
    }
  }, [user, authLoading, company, companyLoading, companyError, navigate, isSpecialRoute]);

  // Show loading
  if (authLoading || (companyLoading && !isSpecialRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if company failed to load (except on special routes)
  if (!isSpecialRoute && companyError && !company) {
    const errorMessage = companyError?.message?.toLowerCase() || '';
    
    // Don't show error for temporary network issues
    if (!errorMessage.includes('failed to fetch') && 
        !errorMessage.includes('network') &&
        !errorMessage.includes('timeout')) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Failed to Load Company Data</AlertTitle>
            <AlertDescription className="mt-2">
              {companyError.message}
              <div className="mt-4 flex gap-2">
                <Button onClick={() => window.location.reload()} size="sm">
                  Retry
                </Button>
                <Button variant="outline" onClick={() => navigate('/auth')} size="sm">
                  Sign Out
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
  }

  // User not authenticated
  if (!user) {
    return null;
  }

  // Render without layout for special routes
  if (isSpecialRoute) {
    return <>{children}</>;
  }

  // Render with layout for normal protected routes
  return <ProtectedLayout>{children}</ProtectedLayout>;
};
