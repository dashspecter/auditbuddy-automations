import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScoutAuth } from '@/hooks/useScoutAuth';
import { Loader2, Clock, ShieldX } from 'lucide-react';

interface ScoutProtectedRouteProps {
  children: ReactNode;
}

export function ScoutProtectedRoute({ children }: ScoutProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isScout, isActive, isPending, isLoading } = useScoutAuth();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isScout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldX className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground">Your account does not have scout access.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Clock className="h-16 w-16 text-warning mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Pending Approval</h1>
        <p className="text-muted-foreground max-w-md">
          Your scout account is being reviewed. You'll receive access once approved by the team.
        </p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldX className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Account Inactive</h1>
        <p className="text-muted-foreground">Your scout account is currently inactive. Please contact support.</p>
      </div>
    );
  }

  return <>{children}</>;
}
