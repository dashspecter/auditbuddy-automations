import { ReactNode } from 'react';
import { usePermissions, CompanyPermission } from '@/hooks/useCompanyPermissions';

interface PermissionGateProps {
  permission: CompanyPermission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions.
 * Owners and admins always have access.
 * Members need the specific permission granted.
 */
export const PermissionGate = ({ permission, children, fallback = null }: PermissionGateProps) => {
  const { hasPermission, isLoading } = usePermissions();

  // While loading, show nothing to prevent flicker
  if (isLoading) return null;

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Higher-order component version for wrapping entire pages
 */
export const withPermission = (permission: CompanyPermission, fallback?: ReactNode) => {
  return (WrappedComponent: React.ComponentType) => {
    return function PermissionWrapper(props: any) {
      return (
        <PermissionGate permission={permission} fallback={fallback}>
          <WrappedComponent {...props} />
        </PermissionGate>
      );
    };
  };
};
