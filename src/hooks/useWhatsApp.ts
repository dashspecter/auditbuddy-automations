import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

// ── Messaging Channel ──
export function useMessagingChannel() {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['messaging_channel', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messaging_channels')
        .select('*')
        .eq('company_id', company!.id)
        .eq('channel_type', 'whatsapp')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertMessagingChannel() {
  const { company } = useCompanyContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: existing } = await supabase
        .from('messaging_channels')
        .select('id')
        .eq('company_id', company!.id)
        .eq('channel_type', 'whatsapp')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('messaging_channels')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('messaging_channels')
          .insert({ ...values, company_id: company!.id, channel_type: 'whatsapp', provider: 'twilio' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messaging_channel'] });
      toast.success('WhatsApp channel saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Templates ──
export function useWaTemplates() {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['wa_templates', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_message_templates')
        .select('*')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

export function useCreateWaTemplate() {
  const { company } = useCompanyContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const row = { ...values, company_id: company!.id };
      const { error } = await supabase
        .from('wa_message_templates')
        .insert(row as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa_templates'] });
      toast.success('Template created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { error } = await supabase
        .from('wa_message_templates')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa_templates'] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wa_message_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa_templates'] });
      toast.success('Template deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Notification Rules ──
export function useNotificationRules() {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['notification_rules_wa', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*, wa_message_templates(name)')
        .eq('company_id', company!.id)
        .order('event_type');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

export function useUpsertNotificationRule() {
  const { company } = useCompanyContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      if (id) {
        const { error } = await supabase.from('notification_rules').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const row = { ...values, company_id: company!.id };
        const { error } = await supabase.from('notification_rules').insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification_rules_wa'] });
      toast.success('Rule saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Outbound Messages (logs) ──
export function useOutboundMessages(filters?: { status?: string; event_type?: string; limit?: number }) {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['outbound_messages', company?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('outbound_messages')
        .select('*, wa_message_templates(name), employees(first_name, last_name)')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.event_type) query = query.eq('event_type', filters.event_type);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

// ── Employee Messaging Preferences ──
export function useEmployeeMessagingPrefs(employeeId?: string) {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['emp_messaging_prefs', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_messaging_preferences')
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('company_id', company!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!employeeId && !!company?.id,
  });
}

export function useUpsertEmployeeMessagingPrefs() {
  const { company } = useCompanyContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employee_id, ...values }: Record<string, any>) => {
      const { data: existing } = await supabase
        .from('employee_messaging_preferences')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('company_id', company!.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('employee_messaging_preferences')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_messaging_preferences')
          .insert({ ...values, employee_id, company_id: company!.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['emp_messaging_prefs', vars.employee_id] });
      toast.success('Messaging preferences saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Message Stats (server-side counts to avoid 1000-row limit) ──
export function useMessageStats() {
  const { company } = useCompanyContext();
  return useQuery({
    queryKey: ['message_stats', company?.id],
    queryFn: async () => {
      const companyId = company!.id;

      const [totalRes, sentRes, deliveredRes, readRes, failedRes] = await Promise.all([
        supabase.from('outbound_messages').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('outbound_messages').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'sent'),
        supabase.from('outbound_messages').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'delivered'),
        supabase.from('outbound_messages').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'read'),
        supabase.from('outbound_messages').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'failed'),
      ]);

      const total = totalRes.count ?? 0;
      const sent = sentRes.count ?? 0;
      const delivered = deliveredRes.count ?? 0;
      const read = readRes.count ?? 0;
      const failed = failedRes.count ?? 0;

      return {
        total,
        sent,
        delivered,
        read,
        failed,
        deliveredPct: total ? Math.round((delivered / total) * 100) : 0,
        readPct: total ? Math.round((read / total) * 100) : 0,
        failedPct: total ? Math.round((failed / total) * 100) : 0,
      };
    },
    enabled: !!company?.id,
  });
}
