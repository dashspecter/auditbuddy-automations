import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: 'location' | 'staff';
  is_global: boolean;
  location?: string;
  location_id?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template_locations?: { location_id: string }[];
}

export interface AuditSection {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AuditField {
  id: string;
  section_id: string;
  name: string;
  field_type: 'rating' | 'yesno' | 'text' | 'number' | 'date';
  is_required: boolean;
  display_order: number;
  options?: any;
  created_at: string;
  updated_at: string;
}

export const useTemplates = (type?: 'location' | 'staff') => {
  return useQuery({
    queryKey: ['audit_templates', type],
    queryFn: async () => {
      let query = supabase
        .from('audit_templates')
        .select('*, template_locations(location_id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditTemplate[];
    },
  });
};

export const useTemplate = (id: string) => {
  return useQuery({
    queryKey: ['audit_template', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as AuditTemplate | null;
    },
    enabled: !!id,
  });
};

export const useTemplateSections = (templateId: string) => {
  return useQuery({
    queryKey: ['audit_sections', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AuditSection[];
    },
    enabled: !!templateId,
  });
};

export const useSectionFields = (sectionId: string) => {
  return useQuery({
    queryKey: ['audit_fields', sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_fields')
        .select('*')
        .eq('section_id', sectionId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AuditField[];
    },
    enabled: !!sectionId,
  });
};

export const useTemplateWithSectionsAndFields = (templateId: string) => {
  const { data: template, isLoading: templateLoading } = useTemplate(templateId);
  const { data: sections, isLoading: sectionsLoading } = useTemplateSections(templateId);
  
  return useQuery({
    queryKey: ['template_full', templateId],
    queryFn: async () => {
      if (!sections) return null;

      const sectionsWithFields = await Promise.all(
        sections.map(async (section) => {
          const { data: fields } = await supabase
            .from('audit_fields')
            .select('*')
            .eq('section_id', section.id)
            .order('display_order', { ascending: true });

          return {
            ...section,
            fields: fields || [],
          };
        })
      );

      return {
        template,
        sections: sectionsWithFields,
      };
    },
    enabled: !!template && !!sections && !templateLoading && !sectionsLoading,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (templateData: {
      name: string;
      description?: string;
      template_type: 'location' | 'staff';
      is_global: boolean;
      is_active: boolean;
      location_ids?: string[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { location_ids, ...template } = templateData;

      // Create the template
      const { data, error } = await supabase
        .from('audit_templates')
        .insert([{ ...template, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;

      // If not global and has location_ids, create junction table entries
      if (!template.is_global && location_ids && location_ids.length > 0) {
        const junctionRecords = location_ids.map(location_id => ({
          template_id: data.id,
          location_id,
        }));

        const { error: junctionError } = await supabase
          .from('template_locations')
          .insert(junctionRecords);

        if (junctionError) throw junctionError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_templates'] });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_templates'] });
      queryClient.invalidateQueries({ queryKey: ['audit_template', data.id] });
    },
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (section: Omit<AuditSection, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('audit_sections')
        .insert([section])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_sections', data.template_id] });
    },
  });
};

export const useUpdateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditSection> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_sections', data.template_id] });
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audit_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_sections'] });
    },
  });
};

export const useCreateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Omit<AuditField, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('audit_fields')
        .insert([field])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_fields', data.section_id] });
    },
  });
};

export const useUpdateField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AuditField> & { id: string }) => {
      const { data, error } = await supabase
        .from('audit_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit_fields', data.section_id] });
    },
  });
};

export const useDeleteField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audit_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_fields'] });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete all fields in sections
      const { data: sections } = await supabase
        .from('audit_sections')
        .select('id')
        .eq('template_id', id);

      if (sections) {
        const sectionIds = sections.map(s => s.id);
        await supabase
          .from('audit_fields')
          .delete()
          .in('section_id', sectionIds);
      }

      // Then delete all sections
      await supabase
        .from('audit_sections')
        .delete()
        .eq('template_id', id);

      // Finally delete the template
      const { error } = await supabase
        .from('audit_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_templates'] });
      queryClient.invalidateQueries({ queryKey: ['template_library'] });
    },
  });
};
