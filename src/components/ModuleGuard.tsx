import { ReactNode } from 'react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

interface ModuleGuardProps {
  children: ReactNode;
  module: string;
  fallback?: ReactNode;
}

export const ModuleGuard = ({ children, module, fallback }: ModuleGuardProps) => {
  const { hasModule, isLoading } = useCompanyContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasModule(module)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Module Not Activated</CardTitle>
            <CardDescription>
              This feature requires the <strong>{getModuleName(module)}</strong> module to be activated for your company.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Contact your administrator to activate this module in Company Settings.
            </p>
            <Link to="/dashboard" className="block">
              <Button className="w-full" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

const getModuleName = (module: string): string => {
  const moduleNames: Record<string, string> = {
    'location_audits': 'Location Audits',
    'staff_performance': 'Staff Performance',
    'equipment_management': 'Equipment Management',
    'notifications': 'Notifications',
    'reports': 'Reports & Analytics',
    'wastage': 'Wastage',
    'qr_forms': 'QR Forms (HACCP / Quality Records)',
  };
  return moduleNames[module] || module;
};
