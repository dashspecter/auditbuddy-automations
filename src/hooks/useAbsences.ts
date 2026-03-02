import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AbsenceData {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  shiftDate: string;
  locationId: string;
  companyId: string;
}

export const useAbsences = (startDate: string, endDate: string) => {
  const queryClient = useQueryClient();

  const { data: absences = [] } = useQuery({
    queryKey: ["workforce_exceptions", "absence", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workforce_exceptions")
        .select("id, employee_id, shift_id")
        .eq("exception_type", "absence")
        .gte("shift_date", startDate)
        .lte("shift_date", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!startDate && !!endDate,
  });

  const recordedAbsenceKeys = useMemo(() => {
    const keys = new Set<string>();
    absences.forEach((a) => keys.add(`${a.employee_id}_${a.shift_id}`));
    return keys;
  }, [absences]);

  const isAbsent = (employeeId: string, shiftId: string) =>
    recordedAbsenceKeys.has(`${employeeId}_${shiftId}`);

  const isDayPastOrToday = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  };

  const refreshAbsences = () => {
    queryClient.invalidateQueries({ queryKey: ["workforce_exceptions", "absence", startDate, endDate] });
    queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
  };

  return { isAbsent, isDayPastOrToday, refreshAbsences };
};

export type { AbsenceData };
