import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface SmartBackOptions {
  /** Fallback path if no safe navigation available - for admin pages */
  adminFallback?: string;
  /** Fallback path if no safe navigation available - for staff pages */
  staffFallback?: string;
}

/**
 * Smart back navigation that respects context.
 * - Desktop admin pages won't navigate to /staff/* routes
 * - Mobile staff pages won't navigate to admin routes
 * - Uses location.state.from when safe
 * - Falls back to appropriate default based on current route context
 */
export function useSmartBack(options: SmartBackOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const {
    adminFallback = "/dashboard",
    staffFallback = "/staff",
  } = options;

  const goBack = useCallback(() => {
    const from = (location.state as { from?: string })?.from;
    const currentPath = location.pathname;
    
    // Determine if we're in admin or staff context
    const isAdminContext = currentPath.startsWith('/admin/') || 
                           currentPath.startsWith('/reports/') ||
                           currentPath.startsWith('/dashboard');
    const isStaffContext = currentPath.startsWith('/staff/') || 
                           currentPath.startsWith('/mobile/') ||
                           currentPath.startsWith('/kiosk/');

    // Prefixes that are unsafe for desktop admin navigation
    const staffPrefixes = ['/mobile', '/kiosk', '/staff/'];
    // Prefixes that are unsafe for mobile staff navigation  
    const adminPrefixes = ['/admin/', '/reports/', '/dashboard'];

    // On mobile (staff context): avoid admin routes
    if (isMobile || isStaffContext) {
      const isSafeFrom = from && !adminPrefixes.some(prefix => from.startsWith(prefix));
      
      if (isSafeFrom) {
        navigate(from);
      } else if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(staffFallback, { replace: true });
      }
      return;
    }

    // Desktop (admin context): avoid staff routes
    if (isAdminContext || !isMobile) {
      const isSafeFrom = from && !staffPrefixes.some(prefix => from.startsWith(prefix));
      
      if (isSafeFrom) {
        navigate(from);
      } else if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(adminFallback, { replace: true });
      }
      return;
    }

    // Generic fallback
    if (from) {
      navigate(from);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(adminFallback, { replace: true });
    }
  }, [navigate, location.state, location.pathname, isMobile, adminFallback, staffFallback]);

  return goBack;
}
