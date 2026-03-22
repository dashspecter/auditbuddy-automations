import { Building2, Shield } from "lucide-react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";

export function DashScopeBar() {
  const { company } = useCompanyContext();
  const { data: roleData } = useUserRole();

  const roleName = roleData?.isAdmin ? "Admin" : roleData?.isManager ? "Manager" : roleData?.isChecker ? "Checker" : "Staff";

  return (
    <div className="flex items-center gap-3 px-1 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3 w-3" />
        <span className="font-medium text-foreground/70 truncate max-w-[140px]">{company?.name ?? "—"}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Shield className="h-3 w-3" />
        <span>{roleName}</span>
      </div>
    </div>
  );
}
