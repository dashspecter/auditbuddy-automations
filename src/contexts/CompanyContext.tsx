import React, { createContext, useContext, ReactNode, useEffect, useRef, useMemo, useCallback } from 'react';
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

  const tier: PricingTier = useMemo(
    () => (company?.subscription_tier as PricingTier) || 'starter',
    [company?.subscription_tier]
  );

  const hasModule = useCallback(
    (moduleName: string) => modules.some(m => m.module_name === moduleName && m.is_active),
    [modules]
  );

  const canAccessModuleFn = useCallback(
    (moduleName: string) => canAccessModule(tier, moduleName) && hasModule(moduleName),
    [tier, hasModule]
  );

  // Calculate trial status — memoized so downstream components don't re-render on unrelated changes
  const { isAccountPaused, isPendingApproval, isTrialExpired, trialDaysRemaining } = useMemo(() => {
    const trialEndsAt = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;
    const now = new Date();
    return {
      isAccountPaused: company?.status === 'paused',
      isPendingApproval: company?.status === 'pending',
      isTrialExpired: trialEndsAt ? trialEndsAt < now : false,
      trialDaysRemaining: trialEndsAt
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    };
  }, [company?.status, company?.trial_ends_at]);

  // Redirect to pending approval page if company is pending (SPA navigation)
  React.useEffect(() => {
    if (isPendingApproval && location.pathname !== '/pending-approval' && location.pathname !== '/auth') {
      navigate('/pending-approval', { replace: true });
    }
  }, [isPendingApproval, location.pathname, navigate]);

  const isLoading = companyLoading || modulesLoading;

  const contextValue = useMemo(
    () => ({
      company,
      isLoading,
      modules,
      hasModule,
      tier,
      canAccessModule: canAccessModuleFn,
      isTrialExpired,
      trialDaysRemaining,
      isAccountPaused,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [company, isLoading, modules, hasModule, tier, canAccessModuleFn, isTrialExpired, trialDaysRemaining, isAccountPaused]
  );

  return (
    <CompanyContext.Provider value={contextValue}>
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