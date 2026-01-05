import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";

interface RoleBasedViewProps {
  admin?: ReactNode;
  manager?: ReactNode;
  checker?: ReactNode;
  fallback?: ReactNode;
}

export const RoleBasedView = ({ admin, manager, checker, fallback }: RoleBasedViewProps) => {
  const { data: roleData, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (roleData?.isAdmin && admin) {
    return <>{admin}</>;
  }

  if (roleData?.isManager && manager) {
    return <>{manager}</>;
  }

  if (roleData?.isChecker && checker) {
    return <>{checker}</>;
  }

  return <>{fallback}</>;
};
