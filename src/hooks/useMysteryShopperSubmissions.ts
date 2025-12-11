import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MysteryShopperSubmission {
  id: string;
  template_id: string;
  company_id: string;
  location_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  submitted_at: string;
  overall_score: number | null;
  raw_answers: Record<string, any>;
  voucher_id: string | null;
  created_at: string;
  mystery_shopper_templates?: {
    name: string;
    company_id: string;
  };
  locations?: {
    name: string;
  };
  vouchers?: {
    code: string;
    value: number;
    currency: string;
    status: string;
  };
}

export const useMysteryShopperSubmissions = (filters?: {
  templateId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  return useQuery({
    queryKey: ["mystery-shopper-submissions", filters],
    queryFn: async () => {
      let query = supabase
        .from("mystery_shopper_submissions")
        .select(`
          *,
          mystery_shopper_templates(name, company_id),
          locations(name),
          vouchers(code, value, currency, status)
        `)
        .order("submitted_at", { ascending: false });
      
      if (filters?.templateId) {
        query = query.eq("template_id", filters.templateId);
      }
      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.dateFrom) {
        query = query.gte("submitted_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("submitted_at", filters.dateTo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MysteryShopperSubmission[];
    },
  });
};

export const useMysteryShopperSubmission = (submissionId?: string) => {
  return useQuery({
    queryKey: ["mystery-shopper-submission", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      
      const { data, error } = await supabase
        .from("mystery_shopper_submissions")
        .select(`
          *,
          mystery_shopper_templates(name, company_id),
          locations(name),
          vouchers(code, value, currency, status, expires_at)
        `)
        .eq("id", submissionId)
        .single();
      
      if (error) throw error;
      return data as MysteryShopperSubmission;
    },
    enabled: !!submissionId,
  });
};

interface CreateSubmissionParams {
  template_id: string;
  company_id: string;
  location_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  raw_answers: Record<string, any>;
  overall_score?: number | null;
}

export const useCreateMysteryShopperSubmission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateSubmissionParams) => {
      // Use edge function to bypass RLS for public submissions
      const { data, error } = await supabase.functions.invoke('submit-mystery-shopper', {
        body: params,
      });
      
      // Check for error in response data first (edge function returns error in body)
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (error) {
        // Try to parse error message from the response
        const errorMessage = error.message || 'Failed to submit survey';
        throw new Error(errorMessage);
      }
      
      return { submission: data.submission, voucher: data.voucher };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
    onError: (error) => {
      // Don't add "Failed to submit" prefix if the error already has a clear message
      toast.error(error.message);
    },
  });
};
