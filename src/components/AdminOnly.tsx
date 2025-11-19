import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminOnly = ({ children, fallback = null }: AdminOnlyProps) => {
  const { data: roleData, isLoading } = useUserRole();

  // Don't show anything while loading to avoid UI flicker
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Only render children if user is admin
  if (roleData?.isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
