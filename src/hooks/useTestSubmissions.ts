import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TestSubmission {
  id: string;
  test_id: string;
  employee_id: string | null;
  staff_name: string | null;
  staff_location: string | null;
  score: number | null;
  passed: boolean | null;
  completed_at: string | null;
  time_taken_minutes: number | null;
  tests?: {
    title: string;
  };
}

export const useTestSubmissions = (employeeId?: string) => {
  return useQuery({
    queryKey: ["test-submissions", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("test_submissions")
        .select(`
          id,
          test_id,
          employee_id,
          staff_name,
          staff_location,
          score,
          passed,
          completed_at,
          time_taken_minutes,
          tests(title)
        `)
        .order("completed_at", { ascending: false });
      
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TestSubmission[];
    },
    enabled: !!employeeId,
  });
};
