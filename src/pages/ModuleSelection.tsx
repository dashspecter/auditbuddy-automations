import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ModuleSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'location_audits',
    'staff_performance',
    'equipment_management',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modules = [
    { 
      id: 'location_audits', 
      name: 'Location Audits', 
      description: 'Audit scheduling, templates, and compliance tracking',
      icon: '📍'
    },
    { 
      id: 'staff_performance', 
      name: 'Staff Performance', 
      description: 'Employee audits and performance tracking',
      icon: '👥'
    },
    { 
      id: 'equipment_management', 
      name: 'Equipment Management', 
      description: 'Equipment tracking and maintenance schedules',
      icon: '⚙️'
    },
    { 
      id: 'notifications', 
      name: 'Notifications', 
      description: 'Notification templates and recurring alerts',
      icon: '🔔'
    },
    { 
      id: 'reports', 
      name: 'Reports & Analytics', 
      description: 'Advanced reporting and data analytics',
      icon: '📊'
    },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error('Company not found');

      // Activate selected modules
      const moduleInserts = selectedModules.map(moduleName => ({
        company_id: companyUser.company_id,
        module_name: moduleName,
        is_active: true,
      }));

      const { error: modulesError } = await supabase
        .from('company_modules')
        .insert(moduleInserts);

      if (modulesError) throw modulesError;

      toast({
        title: "Modules activated!",
        description: "Your selected modules have been activated successfully",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error activating modules:', error);
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
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Choose Your Modules</CardTitle>
            <CardDescription className="text-base">
              Select the features you want to activate for your company
            </CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm font-normal">
              Step 2 of 2
            </Badge>
            <Badge variant="outline" className="text-sm font-semibold text-primary">
              €0 / month
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className={`relative flex items-start space-x-3 p-5 rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md ${
                    selectedModules.includes(module.id)
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                  onClick={() => toggleModule(module.id)}
                >
                  <Checkbox
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => toggleModule(module.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{module.icon}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-base">{module.name}</p>
                        {selectedModules.includes(module.id) && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Free
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base"
                disabled={isSubmitting || selectedModules.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Activating Modules...
                  </>
                ) : (
                  `Activate ${selectedModules.length} Module${selectedModules.length !== 1 ? 's' : ''}`
                )}
              </Button>
              {selectedModules.length === 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  Please select at least one module to continue
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
