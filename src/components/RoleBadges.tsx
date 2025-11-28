import { Badge } from "@/components/ui/badge";
import { Shield, Building2 } from "lucide-react";

interface RoleBadgesProps {
  platformRole?: string | null;
  companyRole?: string | null;
  size?: "sm" | "md";
}

export const RoleBadges = ({ platformRole, companyRole, size = "md" }: RoleBadgesProps) => {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  const getPlatformRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30';
      case 'manager':
        return 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30';
      case 'checker':
        return 'bg-accent/20 text-accent border-accent/30 hover:bg-accent/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCompanyRoleColor = (role: string) => {
    switch (role) {
      case 'company_owner':
        return 'bg-warning/20 text-warning border-warning/30 hover:bg-warning/30';
      case 'company_admin':
        return 'bg-success/20 text-success border-success/30 hover:bg-success/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatPlatformRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatCompanyRole = (role: string) => {
    return role.replace('company_', '').split('_').map(
      word => word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {platformRole && (
        <Badge 
          variant="outline" 
          className={`${getPlatformRoleColor(platformRole)} ${sizeClasses} flex items-center gap-1`}
        >
          <Shield className={iconSize} />
          {formatPlatformRole(platformRole)}
        </Badge>
      )}
      {companyRole && (
        <Badge 
          variant="outline" 
          className={`${getCompanyRoleColor(companyRole)} ${sizeClasses} flex items-center gap-1`}
        >
          <Building2 className={iconSize} />
          {formatCompanyRole(companyRole)}
        </Badge>
      )}
    </div>
  );
};
