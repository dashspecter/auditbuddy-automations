import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check } from "lucide-react";

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'location_audits',
    'staff_performance',
    'equipment_management',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modules = [
    { id: 'location_audits', name: 'Location Audits', description: 'Audit scheduling, templates, and compliance tracking' },
    { id: 'staff_performance', name: 'Staff Performance', description: 'Employee audits and performance tracking' },
    { id: 'equipment_management', name: 'Equipment Management', description: 'Equipment tracking and maintenance schedules' },
    { id: 'notifications', name: 'Notifications', description: 'Notification templates and recurring alerts' },
    { id: 'reports', name: 'Reports & Analytics', description: 'Advanced reporting and data analytics' },
  ];

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from company name
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

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          slug: companySlug,
          status: 'active',
          subscription_tier: 'starter',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Dashspect!</CardTitle>
          <CardDescription>
            Let's set up your company account and choose your modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-4">
              <Label>Select Modules to Activate</Label>
              <div className="space-y-3">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      selectedModules.includes(module.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleModule(module.id)}
                  >
                    <Checkbox
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{module.name}</p>
                        {selectedModules.includes(module.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {module.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !companyName || !companySlug || selectedModules.length === 0}
            >
              {isSubmitting ? "Creating Company..." : "Create Company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}