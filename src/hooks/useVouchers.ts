import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Voucher {
  id: string;
  company_id: string;
  location_ids: string[];
  customer_name: string;
  code: string;
  value: number;
  currency: string;
  brand_logo_url: string | null;
  terms_text: string | null;
  expires_at: string;
  status: 'active' | 'redeemed' | 'expired';
  redeemed_at: string | null;
  linked_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useVouchers = (filters?: {
  status?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  return useQuery({
    queryKey: ["vouchers", filters],
    queryFn: async () => {
      let query = supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.locationId) {
        query = query.contains("location_ids", [filters.locationId]);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Voucher[];
    },
  });
};

export const useVoucher = (voucherId?: string) => {
  return useQuery({
    queryKey: ["voucher", voucherId],
    queryFn: async () => {
      if (!voucherId) return null;
      
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("id", voucherId)
        .single();
      
      if (error) throw error;
      return data as Voucher;
    },
    enabled: !!voucherId,
  });
};

export const useVoucherByCode = (code?: string) => {
  return useQuery({
    queryKey: ["voucher-code", code],
    queryFn: async () => {
      if (!code) return null;
      
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();
      
      if (error) throw error;
      return data as Voucher;
    },
    enabled: !!code,
  });
};

export const useRedeemVoucher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("vouchers")
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher"] });
      toast.success("Voucher redeemed");
    },
    onError: (error) => {
      toast.error("Failed to redeem voucher: " + error.message);
    },
  });
};

export const useUpdateVoucherStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'redeemed' | 'expired' }) => {
      const updates: Partial<Voucher> = { status };
      if (status === 'redeemed') {
        updates.redeemed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from("vouchers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher"] });
      toast.success("Voucher status updated");
    },
    onError: (error) => {
      toast.error("Failed to update voucher: " + error.message);
    },
  });
};
