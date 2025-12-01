import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Routes that don't need company data
  const isSpecialRoute = location.pathname.startsWith('/onboarding') || 
                         location.pathname === '/pending-approval' ||
                         location.pathname === '/system-health' ||
                         location.pathname === '/debug/system-health';

  // Show loading state while checking auth and company
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

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check for company data (unless on special routes)
  if (!isSpecialRoute) {
    // Redirect to onboarding if no company
    if (!company && !companyError) {
      return <Navigate to="/onboarding/company" replace />;
    }

    // Handle company error with specific messaging
    if (companyError && !company) {
      const errorMessage = companyError?.message?.toLowerCase() || '';
      
      // Redirect on clear "no company" errors
      if (errorMessage.includes('no company') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('no rows')) {
        return <Navigate to="/onboarding/company" replace />;
      }

      // Show error for persistent issues (not temporary network errors)
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
                  <Button variant="outline" onClick={() => window.location.href = '/auth'} size="sm">
                    Sign Out
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        );
      }
    }
  }

  // Render without layout for special routes
  if (isSpecialRoute) {
    return <>{children}</>;
  }

  // Render with layout for normal protected routes
  return <ProtectedLayout>{children}</ProtectedLayout>;
};
