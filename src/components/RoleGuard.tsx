import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/useUserRole";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface RoleGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
  fallbackMessage?: string;
}

export const RoleGuard = ({
  children,
  requireAdmin = false,
  requireManager = false,
  fallbackMessage = "You don't have permission to access this page.",
}: RoleGuardProps) => {
  const { data: roleData, isLoading, error, refetch } = useUserRole();
  const queryClient = useQueryClient();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['user_role'] });
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Permissions</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>We couldn't verify your access permissions. Please try again.</p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check permissions
  const hasAccess =
    (requireAdmin && roleData?.isAdmin) ||
    (requireManager && (roleData?.isManager || roleData?.isAdmin)) ||
    (!requireAdmin && !requireManager);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>{fallbackMessage}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
