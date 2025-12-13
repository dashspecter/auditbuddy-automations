import { ReactNode, useRef, useEffect, useState } from 'react';
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
  const { user, loading: authLoading, isStaff, staffCheckComplete } = useAuth();
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const location = useLocation();
  
  // Track if we've ever had a valid user to prevent redirect during transient null states
  const hadUserRef = useRef(false);
  const [stableNoUser, setStableNoUser] = useState(false);
  
  useEffect(() => {
    if (user) {
      hadUserRef.current = true;
      setStableNoUser(false);
    }
  }, [user]);
  
  // Only mark as stable no-user after a delay when we haven't had a user
  useEffect(() => {
    if (!authLoading && !user && !hadUserRef.current) {
      // Immediate redirect for fresh page loads with no user
      setStableNoUser(true);
    } else if (!authLoading && !user && hadUserRef.current) {
      // If we had a user but now don't, wait a bit to confirm it's real
      const timeout = setTimeout(() => {
        if (!user) {
          setStableNoUser(true);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [user, authLoading]);

  // Routes that don't need company data
  const isSpecialRoute = location.pathname.startsWith('/onboarding') || 
                         location.pathname === '/pending-approval' ||
                         location.pathname.startsWith('/staff/') ||
                         location.pathname === '/staff' ||
                         location.pathname === '/system-health' ||
                         location.pathname === '/debug/system-health';

  // Show loading state while checking auth and staff status
  if (authLoading || !staffCheckComplete || (companyLoading && !isSpecialRoute && !isStaff)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if confirmed no user (not a transient state)
  if (!user && stableNoUser) {
    return <Navigate to="/auth" replace />;
  }
  
  // Still loading/checking if we have no user but not yet stable
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Check if this is a staff-only route (not /staff-audits which is admin/manager route)
  const isStaffRoute = location.pathname === '/staff' || location.pathname.startsWith('/staff/');

  // Staff-only users (not managers/admins) should be on staff routes
  // But staff who are also managers/admins can access non-staff routes
  if (isStaff && !isStaffRoute && !company) {
    return <Navigate to="/staff" replace />;
  }

  // Check for company data (unless on special routes or user is staff)
  if (!isSpecialRoute && !isStaff) {
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

  // Render without layout for special routes or staff routes
  if (isSpecialRoute || isStaffRoute) {
    return <>{children}</>;
  }

  // Render with layout for normal protected routes
  return <ProtectedLayout>{children}</ProtectedLayout>;
};
