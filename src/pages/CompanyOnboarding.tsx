import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, ClipboardList, Wrench, Bell, Users, Briefcase } from "lucide-react";
import { PRICING_TIERS, PricingTier } from "@/config/pricingTiers";

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'plan' | 'company' | 'modules'>('plan');
  const [selectedTier, setSelectedTier] = useState<PricingTier>('professional');
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modules = [
    { id: 'location_audits', name: 'Location Audits', description: 'Audit scheduling, templates, and compliance tracking', icon: ClipboardList, color: 'hsl(var(--chart-1))' },
    { id: 'staff_performance', name: 'Staff Performance', description: 'Employee audits and performance tracking', icon: Users, color: 'hsl(var(--chart-2))' },
    { id: 'equipment_management', name: 'Equipment Management', description: 'Equipment tracking and maintenance schedules', icon: Wrench, color: 'hsl(var(--chart-3))' },
    { id: 'notifications', name: 'Notifications', description: 'Notification templates and recurring alerts', icon: Bell, color: 'hsl(var(--chart-4))' },
    { id: 'reports', name: 'Reports & Analytics', description: 'Advanced reporting and data analytics', icon: Briefcase, color: 'hsl(var(--chart-5))' },
  ];

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setCompanySlug(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if slug is available
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', companySlug)
        .single();

      if (existing) {
        toast({
          title: "Error",
          description: "Company slug already taken. Please choose another.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create company with selected tier
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          status: 'active',
          subscription_tier: selectedTier,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Link user as company owner
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          company_id: company.id,
          user_id: user.id,
          company_role: 'company_owner',
        });

      if (userError) throw userError;

      // Activate selected modules
      const moduleInserts = selectedModules.map(moduleName => ({
        company_id: company.id,
        module_name: moduleName,
        is_active: true,
      }));

      const { error: modulesError } = await supabase
        .from('company_modules')
        .insert(moduleInserts);

      if (modulesError) throw modulesError;

      toast({
        title: "Success!",
        description: "Your company has been created successfully",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const allowedModules = PRICING_TIERS[selectedTier].allowedModules;
  const filteredModules = modules.filter(m => allowedModules.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {step === 'plan' && 'Choose Your Plan'}
            {step === 'company' && 'Create Your Company'}
            {step === 'modules' && 'Select Modules'}
          </CardTitle>
          <CardDescription>
            {step === 'plan' && 'Select a pricing tier that fits your needs'}
            {step === 'company' && 'Set up your company profile'}
            {step === 'modules' && 'Choose the features you want to activate'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'plan' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {Object.values(PRICING_TIERS).map((tier) => {
                  const Icon = tier.icon;
                  const isSelected = selectedTier === tier.id;

                  return (
                    <Card
                      key={tier.id}
                      className={`cursor-pointer transition-all relative ${
                        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                      } ${tier.id === 'professional' ? 'border-primary' : ''}`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      {tier.id === 'professional' && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
                          Popular
                        </Badge>
                      )}
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-6 w-6" style={{ color: tier.color }} />
                          <CardTitle className="text-xl">{tier.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">{tier.description}</CardDescription>
                        <div className="mt-3">
                          <span className="text-3xl font-bold">${tier.price}</span>
                          <span className="text-muted-foreground text-sm">/{tier.billingPeriod}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {tier.features.slice(0, 4).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => setStep('company')}
              >
                Continue with {PRICING_TIERS[selectedTier].name}
              </Button>
            </div>
          )}

          {step === 'company' && (
            <form onSubmit={(e) => { e.preventDefault(); setStep('modules'); }} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      handleSlugChange(e.target.value);
                    }}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySlug">Company URL Identifier *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">dashspect.com/</span>
                    <Input
                      id="companySlug"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value)}
                      placeholder="acme-corp"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('plan')} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue to Modules
                </Button>
              </div>
            </form>
          )}

          {step === 'modules' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Select Modules</Label>
                  <Badge variant="secondary">{PRICING_TIERS[selectedTier].name} Plan</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available modules for your {PRICING_TIERS[selectedTier].name} plan
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredModules.map((module) => {
                    const Icon = module.icon;
                    const isSelected = selectedModules.includes(module.id);

                    return (
                      <Card
                        key={module.id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                        }`}
                        onClick={() => toggleModule(module.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: `${module.color}15` }}>
                                <Icon className="h-5 w-5" style={{ color: module.color }} />
                              </div>
                              <div>
                                <CardTitle className="text-base">{module.name}</CardTitle>
                              </div>
                            </div>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleModule(module.id)}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm">{module.description}</CardDescription>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('company')} className="flex-1">
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!companyName || !companySlug || selectedModules.length === 0 || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Company'}
                </Button>
              </div>

              {selectedModules.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Select at least one module to continue
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
