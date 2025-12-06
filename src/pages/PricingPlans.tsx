import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { PRICING_TIERS, PricingTier, getAvailableModulesForTier } from '@/config/pricingTiers';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';

// Human-friendly module names
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  location_audits: 'Location Audits',
  staff_performance: 'Staff Performance',
  equipment_management: 'Equipment Management',
  notifications: 'Notifications',
  reports: 'Reports & Analytics',
  workforce: 'Workforce Management',
  documents: 'Document Management',
  inventory: 'Inventory Management',
  insights: 'AI Insights',
  integrations: 'Custom Integrations',
};

// All possible modules
const ALL_MODULES = [
  'location_audits',
  'staff_performance',
  'equipment_management',
  'notifications',
  'reports',
  'workforce',
  'documents',
  'inventory',
  'insights',
  'integrations',
];

export default function PricingPlans() {
  const { company, tier: currentTier } = useCompanyContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<PricingTier | null>(null);

  const handleSelectPlan = async (tier: PricingTier) => {
    if (!company) return;
    
    setLoading(tier);
    try {
      // Update subscription tier
      const { error: tierError } = await supabase
        .from('companies')
        .update({ subscription_tier: tier })
        .eq('id', company.id);

      if (tierError) throw tierError;

      // Get allowed modules for this tier
      const allowedModules = getAvailableModulesForTier(tier);

      // Deactivate modules not in this tier
      const { error: deactivateError } = await supabase
        .from('company_modules')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('company_id', company.id)
        .not('module_name', 'in', `(${allowedModules.join(',')})`);

      if (deactivateError) console.warn('Error deactivating modules:', deactivateError);

      // Activate/create modules in this tier
      for (const moduleName of allowedModules) {
        const { data: existing } = await supabase
          .from('company_modules')
          .select('id')
          .eq('company_id', company.id)
          .eq('module_name', moduleName)
          .single();

        if (existing) {
          await supabase
            .from('company_modules')
            .update({ is_active: true, deactivated_at: null })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('company_modules')
            .insert({
              company_id: company.id,
              module_name: moduleName,
              is_active: true,
            });
        }
      }

      toast.success(`Upgraded to ${PRICING_TIERS[tier].name} plan`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {Object.values(PRICING_TIERS).map((tier) => {
            const Icon = tier.icon;
            const isCurrentPlan = currentTier === tier.id;
            const tierModules = tier.allowedModules;

            return (
              <Card
                key={tier.id}
                className={`relative ${
                  tier.id === 'professional' ? 'border-primary shadow-lg scale-105' : ''
                }`}
              >
                {tier.id === 'professional' && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-8 w-8" style={{ color: tier.color }} />
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/{tier.billingPeriod}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Features</h4>
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Modules included */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Modules Included</h4>
                    <ul className="space-y-2">
                      {ALL_MODULES.map((module) => {
                        const isIncluded = tierModules.includes(module);
                        return (
                          <li key={module} className={`flex items-start gap-2 ${!isIncluded ? 'opacity-50' : ''}`}>
                            {isIncluded ? (
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm ${!isIncluded ? 'line-through text-muted-foreground' : ''}`}>
                              {MODULE_DISPLAY_NAMES[module] || module}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || loading === tier.id}
                    onClick={() => handleSelectPlan(tier.id)}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : loading === tier.id
                      ? 'Updating...'
                      : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </div>
    </div>
  );
}