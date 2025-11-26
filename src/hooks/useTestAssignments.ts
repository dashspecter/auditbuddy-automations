import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TestAssignment {
  id: string;
  test_id: string;
  employee_id: string;
  assigned_by: string;
  assigned_at: string;
  completed: boolean;
  employees?: {
    full_name: string;
    role: string;
    location_id: string;
    locations?: {
      name: string;
    };
  };
  tests?: {
    title: string;
  };
}

export const useTestAssignments = (testId?: string, employeeId?: string) => {
  return useQuery({
    queryKey: ["test-assignments", testId, employeeId],
    queryFn: async () => {
      let query = supabase
        .from("test_assignments")
        .select(`
          id,
          test_id,
          employee_id,
          assigned_by,
          assigned_at,
          completed,
          short_code,
          employees(full_name, role, location_id, locations(name)),
          tests(title)
        `)
        .order("assigned_at", { ascending: false });
      
      if (testId) {
        query = query.eq("test_id", testId);
      }
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TestAssignment[];
    },
  });
};

export const useAssignTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignment: { test_id: string; employee_ids: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const assignments = assignment.employee_ids.map(employee_id => ({
        test_id: assignment.test_id,
        employee_id,
        assigned_by: user.id,
      }));
      
      const { data, error } = await supabase
        .from("test_assignments")
        .insert(assignments)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-assignments"] });
      toast.success("Test assigned successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to assign test: " + error.message);
    },
  });
};

export const useMarkAssignmentComplete = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase
        .from("test_assignments")
        .update({ completed: true })
        .eq("id", assignmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-assignments"] });
    },
    onError: (error: any) => {
      toast.error("Failed to update assignment: " + error.message);
    },
  });
};
