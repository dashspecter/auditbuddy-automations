import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { PRICING_TIERS, PricingTier } from '@/config/pricingTiers';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PricingPlans() {
  const { company, tier: currentTier } = useCompanyContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<PricingTier | null>(null);

  const handleSelectPlan = async (tier: PricingTier) => {
    if (!company) return;
    
    setLoading(tier);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ subscription_tier: tier })
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Plan updated successfully');
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

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

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
