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

  return (
    <CompanyContext.Provider
      value={{
        company,
        isLoading: companyLoading || modulesLoading,
        modules,
        hasModule,
        tier,
        canAccessModule: canAccessModuleFn,
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