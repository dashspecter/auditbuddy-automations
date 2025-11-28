import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useCompanyModules, useToggleModule } from '@/hooks/useCompany';
import { PRICING_TIERS, getAvailableModulesForTier } from '@/config/pricingTiers';
import { ClipboardList, Users, Wrench, Bell, Briefcase, Check, X, Lock } from 'lucide-react';
import { toast } from 'sonner';

const MODULE_CONFIG = [
  {
    id: 'location_audits',
    name: 'Location Audits',
    description: 'Comprehensive audit scheduling, templates, and compliance tracking for locations',
    icon: ClipboardList,
    color: 'hsl(var(--chart-1))',
    features: ['Custom templates', 'Scheduled audits', 'Photo documentation', 'Compliance reports'],
  },
  {
    id: 'staff_performance',
    name: 'Staff Performance',
    description: 'Employee audit system and performance tracking with detailed analytics',
    icon: Users,
    color: 'hsl(var(--chart-2))',
    features: ['Employee audits', 'Performance metrics', 'Leaderboards', 'Individual reports'],
  },
  {
    id: 'equipment_management',
    name: 'Equipment Management',
    description: 'Equipment tracking, maintenance scheduling, and intervention management',
    icon: Wrench,
    color: 'hsl(var(--chart-3))',
    features: ['Equipment tracking', 'Maintenance schedules', 'QR code generation', 'Status history'],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Advanced notification system with templates and recurring alerts',
    icon: Bell,
    color: 'hsl(var(--chart-4))',
    features: ['Custom templates', 'Scheduled notifications', 'Recurring alerts', 'Role-based targeting'],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Advanced reporting dashboard with data analytics and insights',
    icon: Briefcase,
    color: 'hsl(var(--chart-5))',
    features: ['Custom reports', 'Data visualization', 'Export capabilities', 'Trend analysis'],
  },
];

export default function ModuleManagement() {
  const { tier, company } = useCompanyContext();
  const { data: activeModules = [], isLoading } = useCompanyModules();
  const toggleModule = useToggleModule();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    moduleId: string;
    moduleName: string;
    action: 'enable' | 'disable';
  }>({
    open: false,
    moduleId: '',
    moduleName: '',
    action: 'enable',
  });

  const allowedModules = getAvailableModulesForTier(tier);
  const currentTierName = PRICING_TIERS[tier].name;

  const isModuleActive = (moduleId: string) => {
    return activeModules.some(m => m.module_name === moduleId && m.is_active);
  };

  const isModuleAllowed = (moduleId: string) => {
    return allowedModules.includes(moduleId);
  };

  const handleToggleClick = (moduleId: string, moduleName: string, currentlyActive: boolean) => {
    if (!isModuleAllowed(moduleId)) {
      toast.error(`This module is not available in your ${currentTierName} plan`);
      return;
    }

    setDialogState({
      open: true,
      moduleId,
      moduleName,
      action: currentlyActive ? 'disable' : 'enable',
    });
  };

  const handleConfirmToggle = async () => {
    if (!company) return;

    // Find the module record by module_name to get the ID
    const moduleRecord = activeModules.find(m => m.module_name === dialogState.moduleId);
    
    if (!moduleRecord) {
      toast.error('Module not found');
      setDialogState({ open: false, moduleId: '', moduleName: '', action: 'enable' });
      return;
    }

    try {
      await toggleModule.mutateAsync({
        moduleId: moduleRecord.id,
        isActive: dialogState.action === 'enable',
      });

      toast.success(
        dialogState.action === 'enable'
          ? `${dialogState.moduleName} has been enabled`
          : `${dialogState.moduleName} has been disabled`
      );
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error('Failed to update module status');
    } finally {
      setDialogState({ open: false, moduleId: '', moduleName: '', action: 'enable' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Module Management</CardTitle>
            <CardDescription>Loading modules...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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

        <div className="grid gap-4">
          {MODULE_CONFIG.map((module) => {
            const Icon = module.icon;
            const isActive = isModuleActive(module.id);
            const isAllowed = isModuleAllowed(module.id);

            return (
              <Card key={module.id} className={isActive ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${module.color}15` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: module.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-xl">{module.name}</CardTitle>
                          {isActive && (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          {!isActive && (
                            <Badge variant="secondary">
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          {!isAllowed && (
                            <Badge variant="destructive">
                              <Lock className="h-3 w-3 mr-1" />
                              Upgrade Required
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mb-4">{module.description}</CardDescription>
                        <div className="grid grid-cols-2 gap-2">
                          {module.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: module.color }}
                              />
                              <span className="text-muted-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() =>
                          handleToggleClick(module.id, module.name, isActive)
                        }
                        disabled={!isAllowed || toggleModule.isPending}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {allowedModules.length < MODULE_CONFIG.length && (
          <Card className="border-muted-foreground/20">
            <CardHeader>
              <CardTitle className="text-lg">Unlock More Modules</CardTitle>
              <CardDescription>
                Upgrade your plan to access all modules and unlock advanced features for your business.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" onClick={() => window.location.href = '/pricing'}>
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
              {dialogState.action === 'enable' ? (
                <>
                  Enabling this module will make all its features available to your team.
                  You can disable it at any time.
                </>
              ) : (
                <>
                  Disabling this module will hide all its features from your team.
                  Your data will be preserved and you can re-enable it later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleModule.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={toggleModule.isPending}
              className={dialogState.action === 'disable' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {toggleModule.isPending
                ? 'Processing...'
                : dialogState.action === 'enable'
                ? 'Enable Module'
                : 'Disable Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
