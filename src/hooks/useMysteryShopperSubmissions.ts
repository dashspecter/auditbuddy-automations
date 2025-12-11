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
      // First create the submission
      const { data: submission, error: submissionError } = await supabase
        .from("mystery_shopper_submissions")
        .insert({
          template_id: params.template_id,
          company_id: params.company_id,
          location_id: params.location_id,
          customer_name: params.customer_name,
          customer_email: params.customer_email,
          customer_phone: params.customer_phone,
          raw_answers: params.raw_answers,
          overall_score: params.overall_score,
        })
        .select()
        .single();
      
      if (submissionError) throw submissionError;
      
      // Get template to create voucher
      const { data: template, error: templateError } = await supabase
        .from("mystery_shopper_templates")
        .select("*")
        .eq("id", params.template_id)
        .single();
      
      if (templateError) throw templateError;
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + template.voucher_expiry_days);
      
      // Create voucher
      const { data: voucher, error: voucherError } = await supabase
        .from("vouchers")
        .insert({
          company_id: params.company_id,
          location_ids: template.default_location_ids || [],
          customer_name: params.customer_name,
          value: template.voucher_value,
          currency: template.voucher_currency,
          brand_logo_url: template.brand_logo_url,
          terms_text: template.voucher_terms_text,
          expires_at: expiresAt.toISOString(),
          linked_submission_id: submission.id,
        })
        .select()
        .single();
      
      if (voucherError) throw voucherError;
      
      // Update submission with voucher_id
      await supabase
        .from("mystery_shopper_submissions")
        .update({ voucher_id: voucher.id })
        .eq("id", submission.id);
      
      return { submission, voucher };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
    onError: (error) => {
      toast.error("Failed to submit: " + error.message);
    },
  });
};
