import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PricingTier, canAccessModule } from '@/config/pricingTiers';
import { useCompany, useCompanyModules } from '@/hooks/useCompany';
import { logCompanyChange, logBootstrap, logDebug } from '@/lib/debug/logger';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: modules = [], isLoading: modulesLoading } = useCompanyModules();
  const prevCompanyIdRef = useRef<string | null>(null);

  // Log company context changes for stability diagnostics
  useEffect(() => {
    const newCompanyId = company?.id || null;
    const isLoading = companyLoading || modulesLoading;
    const status = isLoading ? 'loading' : (company ? 'ready' : 'no-company');
    
    // Only log when company ID changes or loading state changes significantly
    if (newCompanyId !== prevCompanyIdRef.current) {
      logCompanyChange(newCompanyId, status);
      logBootstrap('company', { 
        companyId: newCompanyId?.slice(0, 8), 
        modulesCount: modules.length,
        status 
      });
      prevCompanyIdRef.current = newCompanyId;
    }
  }, [company?.id, companyLoading, modulesLoading, modules.length]);

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

  // Redirect to pending approval page if company is pending (SPA navigation)
  React.useEffect(() => {
    if (isPendingApproval && location.pathname !== '/pending-approval' && location.pathname !== '/auth') {
      navigate('/pending-approval', { replace: true });
    }
  }, [isPendingApproval, location.pathname, navigate]);

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