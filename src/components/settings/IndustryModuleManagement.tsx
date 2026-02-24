import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/hooks/useCompany";
import { useIndustries } from "@/hooks/useIndustries";
import { useAvailableModules } from "@/hooks/useModules";
import { useCompanyModules } from "@/hooks/useCompany";
import { useToggleCompanyModule } from "@/hooks/useModules";
import { Store, HardHat, ShoppingBag, Sparkles, Building2, ClipboardList, Users, Wrench, Bell, Briefcase, BarChart, FileText, Package, Lightbulb, Link2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Module dependencies - which modules enhance or require other modules
const MODULE_DEPENDENCIES: Record<string, { enhances?: string[]; worksWellWith?: string[]; description?: string }> = {
  'location_audits': {
    worksWellWith: ['workforce', 'reports', 'notifications'],
    description: 'Enhanced by Workforce for staff audits, Reports for analytics, and Notifications for alerts'
  },
  'workforce': {
    worksWellWith: ['location_audits', 'reports', 'notifications', 'documents'],
    description: 'Works well with Audits for staff performance, Reports for analytics, and Documents for training'
  },
  'equipment_management': {
    worksWellWith: ['notifications', 'documents'],
    description: 'Enhanced by Notifications for maintenance alerts and Documents for manuals'
  },
  'reports': {
    worksWellWith: ['location_audits', 'workforce', 'equipment_management'],
    description: 'Provides analytics across Audits, Workforce, and Equipment modules'
  },
  'notifications': {
    worksWellWith: ['location_audits', 'workforce', 'equipment_management'],
    description: 'Sends alerts for Audits, Workforce events, and Equipment maintenance'
  },
  'documents': {
    worksWellWith: ['workforce', 'equipment_management'],
    description: 'Training materials for Workforce and manuals for Equipment'
  },
  'inventory': {
    worksWellWith: ['reports', 'notifications'],
    description: 'Enhanced by Reports for stock analytics and Notifications for low stock alerts'
  },
  'insights': {
    worksWellWith: ['location_audits', 'workforce', 'reports'],
    description: 'AI-powered insights from Audits, Workforce, and Reports data'
  }
};

const MODULE_NAMES: Record<string, string> = {
  'location_audits': 'Location Audits',
  'workforce': 'Workforce',
  'equipment_management': 'Equipment',
  'reports': 'Reports',
  'notifications': 'Notifications',
  'documents': 'Documents',
  'inventory': 'Inventory',
  'insights': 'Insights',
  'integrations': 'Integrations',
  'wastage': 'Wastage Tracking',
  'qr_forms': 'QR Forms',
  'whatsapp_messaging': 'WhatsApp Messaging',
  'payroll': 'Payroll & Labor Costs',
  'cmms': 'CMMS (Maintenance)',
  'corrective_actions': 'Corrective Actions',
  'operations': 'Operations'
};

export default function IndustryModuleManagement() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: industries = [], isLoading: industriesLoading } = useIndustries();
  const { data: availableModules = [], isLoading: modulesLoading } = useAvailableModules(company?.industry_id || null);
  const { data: enabledModules = [] } = useCompanyModules();
  const toggleModule = useToggleCompanyModule();

  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [showRecommended, setShowRecommended] = useState(false);

  const industryIcons: Record<string, any> = {
    'restaurants_horeca': Store,
    'construction_builders': HardHat,
    'retail': ShoppingBag,
    'services': Sparkles,
    'other': Building2,
  };

  const moduleIcons: Record<string, any> = {
    'ClipboardList': ClipboardList,
    'Users': Users,
    'Wrench': Wrench,
    'Bell': Bell,
    'Briefcase': Briefcase,
  };

  const currentIndustry = industries.find(i => i.id === company?.industry_id);
  const IndustryIcon = currentIndustry ? industryIcons[currentIndustry.slug] || Building2 : Building2;

  const isModuleEnabled = (moduleCode: string) => {
    return enabledModules.some(m => m.module_name === moduleCode && m.is_active);
  };

  const handleToggle = (moduleCode: string, currentlyEnabled: boolean) => {
    if (!company) return;
    
    toggleModule.mutate({
      companyId: company.id,
      moduleCode,
      isEnabled: !currentlyEnabled,
    });
  };

  const filteredModules = availableModules.filter(module => {
    if (showOnlyEnabled && !isModuleEnabled(module.code)) return false;
    if (showRecommended && module.industry_scope !== 'INDUSTRY_SPECIFIC') return false;
    return true;
  });

  if (companyLoading || industriesLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Industry */}
      <Card>
        <CardHeader>
          <CardTitle>Current Industry</CardTitle>
          <CardDescription>
            Your company's business type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentIndustry && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-3 rounded-lg bg-primary/10">
                <IndustryIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{currentIndustry.name}</h3>
                <p className="text-sm text-muted-foreground">{currentIndustry.description}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Management */}
      <Card>
        <CardHeader>
          <CardTitle>Module Management</CardTitle>
          <CardDescription>
            Enable or disable features for your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-enabled"
                checked={showOnlyEnabled}
                onCheckedChange={setShowOnlyEnabled}
              />
              <Label htmlFor="show-enabled">Show only enabled</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-recommended"
                checked={showRecommended}
                onCheckedChange={setShowRecommended}
              />
              <Label htmlFor="show-recommended">Recommended for my industry</Label>
            </div>
          </div>

          {/* Modules List */}
          <div className="space-y-3">
            {modulesLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : filteredModules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No modules found matching your filters
              </div>
            ) : (
              filteredModules.map((module) => {
                const IconComponent = moduleIcons[module.icon_name || ''] || ClipboardList;
                const enabled = isModuleEnabled(module.code);
                const isRecommended = module.industry_scope === 'INDUSTRY_SPECIFIC';
                const dependencies = MODULE_DEPENDENCIES[module.code];
                
                // Find which connected modules are enabled
                const connectedEnabledModules = dependencies?.worksWellWith?.filter(m => isModuleEnabled(m)) || [];
                const connectedDisabledModules = dependencies?.worksWellWith?.filter(m => !isModuleEnabled(m)) || [];

                return (
                  <div
                    key={module.id}
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{module.name}</h4>
                          {module.industry_scope === 'GLOBAL' && (
                            <Badge variant="secondary" className="text-xs">
                              Global
                            </Badge>
                          )}
                          {isRecommended && (
                            <Badge variant="default" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        
                        {/* Module Dependencies */}
                        {dependencies && (
                          <div className="mt-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                    <Link2 className="h-3 w-3" />
                                    <span>
                                      Works with: {dependencies.worksWellWith?.map(m => MODULE_NAMES[m] || m).join(', ')}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{dependencies.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggle(module.code, enabled)}
                        disabled={toggleModule.isPending}
                      />
                    </div>
                    
                    {/* Warning when disabling a module that has connected enabled modules */}
                    {enabled && connectedEnabledModules.length > 0 && (
                      <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                          Disabling this module may affect functionality in: {connectedEnabledModules.map(m => MODULE_NAMES[m] || m).join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Suggestion when module could be enhanced by enabling other modules */}
                    {enabled && connectedDisabledModules.length > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Enable {connectedDisabledModules.slice(0, 2).map(m => MODULE_NAMES[m] || m).join(' or ')} for enhanced features
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
