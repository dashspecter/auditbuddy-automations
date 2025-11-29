import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, ClipboardList, Wrench, Bell, Users, Briefcase, LogOut, Store, HardHat, ShoppingBag, Sparkles } from "lucide-react";
import { PRICING_TIERS, PricingTier } from "@/config/pricingTiers";
import { useCompany } from "@/hooks/useCompany";
import { useIndustries } from "@/hooks/useIndustries";
import { useAvailableModules } from "@/hooks/useModules";

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: company, isLoading: isCheckingCompany } = useCompany();
  const { data: industries = [], isLoading: industriesLoading } = useIndustries();
  const [step, setStep] = useState<'plan' | 'industry' | 'company' | 'modules'>('plan');
  const [selectedTier, setSelectedTier] = useState<PricingTier>('professional');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModulesPreview, setShowModulesPreview] = useState(false);

  const { data: availableModules = [] } = useAvailableModules(selectedIndustry);

  // Redirect if user already has a company
  useEffect(() => {
    if (!isCheckingCompany && company) {
      navigate('/', { replace: true });
    }
  }, [company, isCheckingCompany, navigate]);

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

      // Create company with selected tier and industry
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          status: 'active',
          subscription_tier: selectedTier,
          industry_id: selectedIndustry,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Link user as company owner
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          company_id: newCompany.id,
          user_id: user.id,
          company_role: 'company_owner',
        });

      if (userError) throw userError;

      // Activate selected modules
      const moduleInserts = selectedModules.map(moduleName => ({
        company_id: newCompany.id,
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

  const toggleModule = (moduleCode: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleCode)
        ? prev.filter(id => id !== moduleCode)
        : [...prev, moduleCode]
    );
  };

  const allowedModules = PRICING_TIERS[selectedTier].allowedModules;
  const filteredModules = availableModules.filter(m => allowedModules.includes(m.code));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const selectedIndustryData = industries.find(i => i.id === selectedIndustry);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/dashspect-logo-512.png?v=2" 
              alt="DashSpect" 
              className="h-8 w-8 rounded-xl bg-primary p-1"
            />
            <span className="text-xl font-bold text-foreground">DashSpect</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {step === 'plan' && 'Choose Your Plan'}
              {step === 'industry' && 'Choose Your Industry'}
              {step === 'company' && 'Create Your Company'}
              {step === 'modules' && 'Select Modules'}
            </CardTitle>
            <CardDescription>
              {step === 'plan' && 'Select a pricing tier that fits your needs'}
              {step === 'industry' && 'Tell us about your business type'}
              {step === 'company' && 'Set up your company profile'}
              {step === 'modules' && 'Choose the features you want to activate'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Plan Selection */}
            {step === 'plan' && !showModulesPreview && (
              <div className="space-y-6">
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModulesPreview(true)}
                    className="gap-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    View Available Modules
                  </Button>
                </div>
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
                            <span className="text-3xl font-bold">€{tier.price}</span>
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
                  onClick={() => setStep('industry')}
                >
                  Continue with {PRICING_TIERS[selectedTier].name}
                </Button>
              </div>
            )}

            {/* Step 2: Industry Selection */}
            {step === 'industry' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {industries.map((industry) => {
                    const Icon = industryIcons[industry.slug] || Building2;
                    const isSelected = selectedIndustry === industry.id;

                    return (
                      <Card
                        key={industry.id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedIndustry(industry.id)}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{industry.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {industry.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep('plan')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setStep('company')}
                    disabled={!selectedIndustry}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Company Details */}
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
                  <Button type="button" variant="outline" onClick={() => setStep('industry')} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue to Modules
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Module Selection */}
            {step === 'modules' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Select Modules</Label>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{PRICING_TIERS[selectedTier].name} Plan</Badge>
                      {selectedIndustryData && (
                        <Badge variant="outline">{selectedIndustryData.name}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available modules for your industry and plan
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredModules.map((module) => {
                      const IconComponent = moduleIcons[module.icon_name || ''] || ClipboardList;
                      const isSelected = selectedModules.includes(module.code);
                      const isRecommended = module.industry_scope === 'INDUSTRY_SPECIFIC';

                      return (
                        <Card
                          key={module.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                          }`}
                          onClick={() => toggleModule(module.code)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{module.name}</CardTitle>
                                  {isRecommended && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleModule(module.code)}
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
    </div>
  );
}
