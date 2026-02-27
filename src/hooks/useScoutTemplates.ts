import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface ScoutTemplateStep {
  id?: string;
  template_id?: string;
  step_order: number;
  prompt: string;
  step_type: 'yes_no' | 'text' | 'number' | 'photo' | 'video' | 'checklist';
  is_required: boolean;
  min_photos: number;
  min_videos: number;
  guidance_text: string | null;
  validation_rules: Record<string, unknown>;
}

export interface ScoutTemplate {
  id: string;
  company_id: string | null;
  title: string;
  category: string;
  estimated_duration_minutes: number;
  guidance_text: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useScoutTemplates() {
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  return useQuery({
    queryKey: ['scout-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('scout_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScoutTemplate[];
    },
    enabled: !!companyId,
  });
}

export function useScoutTemplateSteps(templateId: string | undefined) {
  return useQuery({
    queryKey: ['scout-template-steps', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('scout_template_steps')
        .select('*')
        .eq('template_id', templateId)
        .order('step_order', { ascending: true });
      if (error) throw error;
      return data as ScoutTemplateStep[];
    },
    enabled: !!templateId,
  });
}

export function useCreateScoutTemplate() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const companyId = company?.id;
  
  return useMutation({
    mutationFn: async (data: { title: string; category: string; estimated_duration_minutes: number; guidance_text?: string; steps: Omit<ScoutTemplateStep, 'id' | 'template_id'>[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data: template, error: tErr } = await supabase
        .from('scout_templates')
        .insert({
          company_id: companyId,
          title: data.title,
          category: data.category,
          estimated_duration_minutes: data.estimated_duration_minutes,
          guidance_text: data.guidance_text || null,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (tErr) throw tErr;
      
      if (data.steps.length > 0) {
        const stepsToInsert = data.steps.map(s => ({
          template_id: template.id,
          step_order: s.step_order,
          prompt: s.prompt,
          step_type: s.step_type,
          is_required: s.is_required,
          min_photos: s.min_photos,
          min_videos: s.min_videos,
          guidance_text: s.guidance_text,
          validation_rules: s.validation_rules as Json,
        }));
        const { error: sErr } = await supabase.from('scout_template_steps').insert(stepsToInsert);
        if (sErr) throw sErr;
      }
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-templates'] });
      toast.success('Template created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateScoutTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      category: string;
      estimated_duration_minutes: number;
      guidance_text?: string;
      steps: Omit<ScoutTemplateStep, 'id' | 'template_id'>[];
    }) => {
      const { error: tErr } = await supabase
        .from('scout_templates')
        .update({
          title: data.title,
          category: data.category,
          estimated_duration_minutes: data.estimated_duration_minutes,
          guidance_text: data.guidance_text || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      if (tErr) throw tErr;

      // Replace steps: delete existing, insert new
      const { error: delErr } = await supabase
        .from('scout_template_steps')
        .delete()
        .eq('template_id', data.id);
      if (delErr) throw delErr;

      if (data.steps.length > 0) {
        const stepsToInsert = data.steps.map(s => ({
          template_id: data.id,
          step_order: s.step_order,
          prompt: s.prompt,
          step_type: s.step_type,
          is_required: s.is_required,
          min_photos: s.min_photos,
          min_videos: s.min_videos,
          guidance_text: s.guidance_text,
          validation_rules: s.validation_rules as Json,
        }));
        const { error: sErr } = await supabase.from('scout_template_steps').insert(stepsToInsert);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-templates'] });
      queryClient.invalidateQueries({ queryKey: ['scout-template-steps'] });
      toast.success('Template updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteScoutTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scout_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-templates'] });
      toast.success('Template deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
