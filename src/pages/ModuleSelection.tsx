import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MODULE_REGISTRY, CATEGORY_LABELS, type ModuleDefinition } from "@/config/moduleRegistry";

export default function ModuleSelection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pre-select modules already activated by the onboarding RPC
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!companyUser) return;

        const { data: existing } = await supabase
          .from('company_modules')
          .select('module_name')
          .eq('company_id', companyUser.company_id)
          .eq('is_active', true);

        if (existing?.length) {
          setSelectedModules(existing.map(m => m.module_name));
        }
      } catch (err) {
        console.error('Failed to load existing modules:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadExisting();
  }, []);

  const handleSubmit = async () => {
    if (selectedModules.length === 0) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error('Company not found');

      const companyId = companyUser.company_id;

      // Upsert selected modules as active
      const { error: upsertError } = await supabase
        .from('company_modules')
        .upsert(
          selectedModules.map(m => ({
            company_id: companyId,
            module_name: m,
            is_active: true,
          })),
          { onConflict: 'company_id,module_name' }
        );
      if (upsertError) throw upsertError;

      // Deactivate any unselected modules
      const allCodes = MODULE_REGISTRY.map(m => m.code);
      const unselected = allCodes.filter(c => !selectedModules.includes(c));
      if (unselected.length > 0) {
        const { error: deactivateError } = await supabase
          .from('company_modules')
          .update({ is_active: false, deactivated_at: new Date().toISOString() })
          .eq('company_id', companyId)
          .in('module_name', unselected);
        if (deactivateError) throw deactivateError;
      }

      toast({ title: "Modules activated!", description: "Your selected modules have been activated successfully" });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error activating modules:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  // Group modules by category
  const grouped = MODULE_REGISTRY.reduce<Record<string, ModuleDefinition[]>>((acc, mod) => {
    (acc[mod.category] ??= []).push(mod);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="text-center space-y-4 flex-shrink-0">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Choose Your Modules</CardTitle>
            <CardDescription className="text-base">
              Select the features you want to activate for your company. You can change these later in settings.
            </CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm font-normal">Step 2 of 2</Badge>
            <Badge variant="outline" className="text-sm font-semibold text-primary">
              {selectedModules.length} selected
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 pb-4">
              {(['core', 'operations', 'communication', 'analytics'] as const).map(cat => {
                const modules = grouped[cat];
                if (!modules?.length) return null;
                return (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {CATEGORY_LABELS[cat]}
                    </h3>
                    <div className="space-y-3">
                      {modules.map(mod => {
                        const Icon = mod.icon;
                        const selected = selectedModules.includes(mod.code);
                        return (
                          <div
                            key={mod.code}
                            className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md ${
                              selected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/50 bg-card'
                            }`}
                            onClick={() => toggleModule(mod.code)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleModule(mod.code)}
                                className="mt-1 flex-shrink-0"
                              />
                              <div className={`p-2 rounded-lg bg-background/50 flex-shrink-0 ${mod.color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{mod.displayName}</h4>
                                  {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{mod.description}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  {mod.features.map((f, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <div className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                                      <span>{f}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="pt-4 space-y-3 flex-shrink-0 border-t">
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
        </CardContent>
      </Card>
    </div>
  );
}
