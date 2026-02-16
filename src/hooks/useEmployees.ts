import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getToastError } from "@/lib/errorMessages";

export interface Employee {
  id: string;
  location_id: string;
  full_name: string;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  contract_type: string | null;
  hire_date: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  // ID Document fields (Romanian)
  localitate: string | null;
  serie_id: string | null;
  numar_id: string | null;
  valabilitate_id: string | null;
  cnp: string | null;
  // Additional contract fields
  domiciliu: string | null;
  emisa_de: string | null;
  valabila_de_la: string | null;
  ocupatia: string | null;
  cod_cor: string | null;
  valoare_tichet: number | null;
  perioada_proba_end: string | null;
  // Foreign employee fields
  is_foreign: boolean | null;
  nr_permis_sedere: string | null;
  permis_institutie_emitenta: string | null;
  permis_data_eliberare: string | null;
  permis_data_expirare: string | null;
  numar_aviz: string | null;
  aviz_data_eliberare: string | null;
  aviz_institutie: string | null;
  spor_weekend: number | null;
  locations?: {
    name: string;
  };
  staff_locations?: Array<{
    id: string;
    location_id: string;
    is_primary: boolean;
    locations?: {
      name: string;
    };
  }>;
}

export const useEmployees = (locationId?: string, statusFilter?: string) => {
  return useQuery({
    queryKey: ["employees", locationId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, locations(name), staff_locations(id, location_id, is_primary, locations(name))")
        .order("full_name");
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Employee[];
    },
  });
};

interface UseEmployeesPaginatedOptions {
  locationId?: string;
  searchTerm?: string;
  roleFilter?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}

export const useEmployeesPaginated = (options?: UseEmployeesPaginatedOptions) => {
  const { locationId, searchTerm, roleFilter, statusFilter, page = 1, pageSize = 20 } = options || {};
  
  return useQuery({
    queryKey: ["employees-paginated", locationId, searchTerm, roleFilter, statusFilter, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase
        .from("employees")
        .select("*, locations(name), staff_locations(id, location_id, is_primary, locations(name))", { count: 'exact' })
        .order("full_name");
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (roleFilter) {
        query = query.eq("role", roleFilter);
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { 
        data: data as Employee[], 
        count: count || 0,
        pageCount: Math.ceil((count || 0) / pageSize)
      };
    },
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (employee: Omit<Employee, "id" | "created_at" | "updated_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get user's company_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...employee, created_by: user.id, company_id: companyUser.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
      toast.success("Employee added successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'employees');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
      toast.success("Employee updated successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'employees');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["employees-cursor"] });
      toast.success("Employee deleted successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'employees');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

// ─── Cursor-based pagination (Phase 3) ─────────────────────

interface UseEmployeesCursorOptions {
  locationId?: string;
  searchTerm?: string;
  roleFilter?: string;
  statusFilter?: string;
  pageSize?: number;
  cursor?: string; // full_name of last item (cursor field)
  cursorId?: string; // id of last item (tie-breaker)
  direction?: "next" | "prev";
}

export interface CursorPage<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  nextCursorId: string | null;
  prevCursor: string | null;
  prevCursorId: string | null;
  totalCount: number;
}

export const useEmployeesCursor = (options?: UseEmployeesCursorOptions) => {
  const {
    locationId, searchTerm, roleFilter, statusFilter,
    pageSize = 20, cursor, cursorId, direction = "next",
  } = options || {};

  return useQuery({
    queryKey: ["employees-cursor", locationId, searchTerm, roleFilter, statusFilter, pageSize, cursor, cursorId, direction],
    queryFn: async () => {
      // Count query
      let countQuery = supabase
        .from("employees")
        .select("id", { count: "exact", head: true });

      if (locationId) countQuery = countQuery.eq("location_id", locationId);
      if (searchTerm) countQuery = countQuery.or(`full_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      if (roleFilter) countQuery = countQuery.eq("role", roleFilter);
      if (statusFilter) countQuery = countQuery.eq("status", statusFilter);

      const { count } = await countQuery;

      // Data query
      let query = supabase
        .from("employees")
        .select("*, locations(name), staff_locations(id, location_id, is_primary, locations(name))")
        .order("full_name", { ascending: direction === "next" })
        .order("id", { ascending: direction === "next" })
        .limit(pageSize + 1); // fetch one extra to detect hasMore

      if (locationId) query = query.eq("location_id", locationId);
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,role.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      if (roleFilter) query = query.eq("role", roleFilter);
      if (statusFilter) query = query.eq("status", statusFilter);

      // Apply cursor
      if (cursor && cursorId) {
        if (direction === "next") {
          query = query.or(`full_name.gt.${cursor},and(full_name.eq.${cursor},id.gt.${cursorId})`);
        } else {
          query = query.or(`full_name.lt.${cursor},and(full_name.eq.${cursor},id.lt.${cursorId})`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data || []) as Employee[];

      // If going backwards, reverse to restore natural order
      if (direction === "prev") rows = rows.reverse();

      const hasMore = rows.length > pageSize;
      if (hasMore) rows = rows.slice(0, pageSize);

      const result: CursorPage<Employee> = {
        data: rows,
        hasMore,
        nextCursor: rows.length > 0 ? rows[rows.length - 1].full_name : null,
        nextCursorId: rows.length > 0 ? rows[rows.length - 1].id : null,
        prevCursor: rows.length > 0 ? rows[0].full_name : null,
        prevCursorId: rows.length > 0 ? rows[0].id : null,
        totalCount: count || 0,
      };

      return result;
    },
  });
};
