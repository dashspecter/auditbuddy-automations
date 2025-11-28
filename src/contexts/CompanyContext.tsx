import React, { createContext, useContext, ReactNode } from 'react';
import { useCompany, useCompanyModules } from '@/hooks/useCompany';
import { PricingTier, canAccessModule } from '@/config/pricingTiers';

interface CompanyContextType {
  company: any;
  isLoading: boolean;
  modules: any[];
  hasModule: (moduleName: string) => boolean;
  tier: PricingTier;
  canAccessModule: (moduleName: string) => boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  isAccountPaused: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: modules = [], isLoading: modulesLoading } = useCompanyModules();

  const tier: PricingTier = (company?.subscription_tier as PricingTier) || 'starter';

  const hasModule = (moduleName: string) => {
    return modules.some(m => m.module_name === moduleName && m.is_active);
  };

  const canAccessModuleFn = (moduleName: string) => {
    return canAccessModule(tier, moduleName) && hasModule(moduleName);
  };

  // Calculate trial status
  const isAccountPaused = company?.status === 'paused';
  const isPendingApproval = company?.status === 'pending';
  const trialEndsAt = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;
  const now = new Date();
  const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;
  const trialDaysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Redirect to pending approval page if company is pending
  React.useEffect(() => {
    if (isPendingApproval && window.location.pathname !== '/pending-approval' && window.location.pathname !== '/auth') {
      window.location.href = '/pending-approval';
    }
  }, [isPendingApproval]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        isLoading: companyLoading || modulesLoading,
        modules,
        hasModule,
        tier,
        canAccessModule: canAccessModuleFn,
        isTrialExpired,
        trialDaysRemaining,
        isAccountPaused,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanyContext must be used within CompanyProvider');
  }
  return context;
};