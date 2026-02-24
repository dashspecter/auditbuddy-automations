import { ReactNode } from 'react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { EmptyState } from '@/components/EmptyState';
import { Lock, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModuleGateProps {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ModuleGate = ({ module, children, fallback }: ModuleGateProps) => {
  const { hasModule, canAccessModule, isLoading } = useCompanyContext();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Check if module is enabled
  const isEnabled = hasModule(module);
  const canAccess = canAccessModule(module);

  if (!isEnabled || !canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="container mx-auto py-8">
        <EmptyState
          icon={Lock}
          title={`${module.charAt(0).toUpperCase() + module.slice(1)} Module Not Available`}
          description={
            !isEnabled
              ? `This module is not enabled for your account. Enable it in Billing & Modules to access these features.`
              : `Your subscription tier doesn't include access to this module. Please upgrade your plan.`
          }
          action={{
            label: 'View Billing & Modules',
            onClick: () => navigate('/pricing')
          }}
          secondaryAction={{
            label: 'Back to Dashboard',
            onClick: () => navigate('/dashboard')
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
};
