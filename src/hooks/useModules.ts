import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Module {
  id: string;
  name: string;
  code: string;
  description: string | null;
  base_price: number | null;
  industry_scope: 'GLOBAL' | 'INDUSTRY_SPECIFIC';
  icon_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleWithIndustries extends Module {
  module_industries: {
    industry_id: string;
  }[];
}

// Get all available modules for a specific industry
export const useAvailableModules = (industryId: string | null) => {
  return useQuery({
    queryKey: ["modules", "available", industryId],
    queryFn: async () => {
      if (!industryId) return [];

      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          module_industries (
            industry_id
          )
        `)
        .eq("is_active", true);

      if (error) throw error;

      const modules = data as ModuleWithIndustries[];

      // Filter modules based on industry
      return modules.filter(module => {
        if (module.industry_scope === 'GLOBAL') return true;
        if (module.industry_scope === 'INDUSTRY_SPECIFIC') {
          return module.module_industries.some(mi => mi.industry_id === industryId);
        }
        return false;
      });
    },
    enabled: !!industryId,
  });
};

// Get all modules (for admin)
export const useAllModules = () => {
  return useQuery({
    queryKey: ["modules", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          module_industries (
            industry_id
          )
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as ModuleWithIndustries[];
    },
  });
};

// Toggle module for company
export const useToggleCompanyModule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      moduleCode, 
      isEnabled 
    }: { 
      companyId: string; 
      moduleCode: string; 
      isEnabled: boolean;
    }) => {
      if (isEnabled) {
        // Enable module
        const { error } = await supabase
          .from("company_modules")
          .upsert({
            company_id: companyId,
            module_name: moduleCode,
            is_active: true,
          });

        if (error) throw error;
      } else {
        // Disable module
        const { error } = await supabase
          .from("company_modules")
          .update({ 
            is_active: false,
            deactivated_at: new Date().toISOString()
          })
          .eq("company_id", companyId)
          .eq("module_name", moduleCode);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "modules"] });
      toast({
        title: "Success",
        description: "Module settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
