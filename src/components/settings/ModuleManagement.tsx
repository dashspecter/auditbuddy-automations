import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useCompanyModules, useToggleModule } from '@/hooks/useCompany';
import { PRICING_TIERS, getAvailableModulesForTier } from '@/config/pricingTiers';
import { MODULE_REGISTRY, CATEGORY_LABELS, ModuleDefinition } from '@/config/moduleRegistry';
import { Check, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ModuleManagement() {
  const { tier, company } = useCompanyContext();
  const { data: activeModules = [], isLoading } = useCompanyModules();
  const toggleModule = useToggleModule();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    moduleCode: string;
    moduleName: string;
    action: 'enable' | 'disable';
  }>({
    open: false,
    moduleCode: '',
    moduleName: '',
    action: 'enable',
  });

  const allowedModules = getAvailableModulesForTier(tier);
  const currentTierName = PRICING_TIERS[tier].name;

  const isModuleActive = (code: string) =>
    activeModules.some(m => m.module_name === code && m.is_active);

  const isModuleAllowed = (code: string) => allowedModules.includes(code);

  const handleToggleClick = (code: string, name: string, currentlyActive: boolean) => {
    if (!isModuleAllowed(code)) {
      toast.error(`This module is not available in your ${currentTierName} plan`);
      return;
    }
    setDialogState({ open: true, moduleCode: code, moduleName: name, action: currentlyActive ? 'disable' : 'enable' });
  };

  const handleConfirmToggle = async () => {
    if (!company) return;

    const moduleRecord = activeModules.find(m => m.module_name === dialogState.moduleCode);

    try {
      if (!moduleRecord && dialogState.action === 'enable') {
        const { supabase } = await import('@/integrations/supabase/client');
        const { error } = await supabase
          .from('company_modules')
          .upsert({
            company_id: company.id,
            module_name: dialogState.moduleCode,
            is_active: true,
          }, { onConflict: 'company_id,module_name' });

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['company_modules'] });
        toast.success(`${dialogState.moduleName} has been enabled`);
      } else if (moduleRecord) {
        await toggleModule.mutateAsync({
          moduleId: moduleRecord.id,
          isActive: dialogState.action === 'enable',
        });
        toast.success(
          dialogState.action === 'enable'
            ? `${dialogState.moduleName} has been enabled`
            : `${dialogState.moduleName} has been disabled`
        );
      } else {
        toast.error('Module not found and cannot be disabled');
      }
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error('Failed to update module status');
    } finally {
      setDialogState({ open: false, moduleCode: '', moduleName: '', action: 'enable' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Module Management</CardTitle>
          <CardDescription>Loading modules...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group modules by category
  const grouped = MODULE_REGISTRY.reduce<Record<string, ModuleDefinition[]>>((acc, mod) => {
    (acc[mod.category] ??= []).push(mod);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Module Management</h2>
          <p className="text-muted-foreground">
            Manage your active modules and features. Your current plan is{' '}
            <Badge variant="secondary">{currentTierName}</Badge>
          </p>
        </div>

        {(['core', 'operations', 'communication', 'analytics'] as const).map((cat) => {
          const modules = grouped[cat];
          if (!modules?.length) return null;
          return (
            <div key={cat} className="space-y-3">
              <h3 className="text-lg font-semibold text-muted-foreground">{CATEGORY_LABELS[cat]}</h3>
              <div className="grid gap-3">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = isModuleActive(mod.code);
                  const isAllowed = isModuleAllowed(mod.code);

                  return (
                    <Card key={mod.code} className={isActive ? 'border-primary' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-muted shrink-0">
                              <Icon className={`h-5 w-5 ${mod.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <CardTitle className="text-base">{mod.displayName}</CardTitle>
                                {isActive && (
                                  <Badge className="bg-green-500 text-xs">
                                    <Check className="h-3 w-3 mr-1" />Active
                                  </Badge>
                                )}
                                {!isActive && (
                                  <Badge variant="secondary" className="text-xs">
                                    <X className="h-3 w-3 mr-1" />Inactive
                                  </Badge>
                                )}
                                {!isAllowed && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />Upgrade
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-sm">{mod.description}</CardDescription>
                            </div>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleClick(mod.code, mod.displayName, isActive)}
                            disabled={!isAllowed || toggleModule.isPending}
                            className="shrink-0"
                          />
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {allowedModules.length < MODULE_REGISTRY.length && (
          <Card className="border-muted-foreground/20">
            <CardHeader>
              <CardTitle className="text-lg">Unlock More Modules</CardTitle>
              <CardDescription>
                Upgrade your plan to access all modules and unlock advanced features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" onClick={() => navigate('/pricing')}>
                View Pricing Plans
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={dialogState.open} onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogState.action === 'enable' ? 'Enable' : 'Disable'} {dialogState.moduleName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState.action === 'enable'
                ? 'Enabling this module will make all its features available to your team. You can disable it at any time.'
                : 'Disabling this module will hide all its features from your team. Your data will be preserved and you can re-enable it later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleModule.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={toggleModule.isPending}
              className={dialogState.action === 'disable' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {toggleModule.isPending ? 'Processing...' : dialogState.action === 'enable' ? 'Enable Module' : 'Disable Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
